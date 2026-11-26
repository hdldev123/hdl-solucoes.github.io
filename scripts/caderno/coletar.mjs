#!/usr/bin/env node
// Orquestrador do Caderno HDL: busca fontes, agrupa, redige com IA, valida e publica.
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FONTES } from './fontes.mjs';
import { buscarFonte } from './rss.mjs';
import { agrupar, chaveDoCluster, entidadesDoTitulo, dentroDaJanela, ehOferta, jaPublicado } from './agrupar.mjs';
import { extrairCluster } from './extrair.mjs';
import { ErroRodada, modeloPadrao, redigir, validarConfig } from './redigir.mjs';
import { validar, MOTIVO_SEM_ACENTO } from './validar.mjs';
import { repararMojibakeProfundo } from './texto.mjs';
import { lerIndex, proximaAtualizacao, publicarPost, INTERVALO_MIN_MS } from './publicar.mjs';

export { INTERVALO_MIN_MS };

const MAX_CHAMADAS_IA = 3;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/caderno');

export function lerArgs(argv, env = process.env) {
  const args = { dryRun: false, max: Number(env.CADERNO_MAX_POR_RODADA) || 1, janelaHoras: 30 };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--max=')) args.max = Math.max(1, parseInt(a.slice(6), 10) || args.max);
    else if (a.startsWith('--janela-horas=')) args.janelaHoras = Math.max(1, parseInt(a.slice(15), 10) || args.janelaHoras);
  }
  return args;
}

function formatarDuracao(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

/**
 * Portão de ritmo: em execução agendada, pula a rodada se a última notícia é recente demais.
 * Execuções manuais (workflow_dispatch) ignoram o portão.
 * @returns { pular, mensagem }
 */
export function portaoDeRitmo(posts, { env = process.env, agora = new Date() } = {}) {
  if (env.GITHUB_EVENT_NAME !== 'schedule') return { pular: false, mensagem: '' };
  const horas = Number(env.CADERNO_INTERVALO_MIN_HORAS);
  const minimoMs = Number.isFinite(horas) && horas > 0 ? horas * 3600000 : INTERVALO_MIN_MS;
  const ultima = Date.parse(posts?.[0]?.publicadoEm);
  if (!Number.isFinite(ultima)) return { pular: false, mensagem: '' };
  const idade = agora.getTime() - ultima;
  if (idade >= minimoMs) return { pular: false, mensagem: '' };
  return { pular: true, mensagem: `Rodada pulada: última notícia publicada há ${formatarDuracao(idade)} (mínimo ${formatarDuracao(minimoMs)}).` };
}

function resumoDaRodada(linhas) {
  const arq = process.env.GITHUB_STEP_SUMMARY;
  if (!arq) return;
  const md = ['## Caderno HDL', '', '| Título | Categoria | Fontes |', '| --- | --- | --- |']
    .concat(linhas.length ? linhas.map((l) => `| ${l.titulo.replace(/\|/g, '/')} | ${l.categoria} | ${l.fontes} |`) : ['| (nenhuma notícia publicada nesta rodada) | | |'])
    .join('\n');
  try {
    appendFileSync(arq, md + '\n');
  } catch (e) {
    console.warn(`Não foi possível escrever o resumo do job: ${e.message}`);
  }
}

export async function coletarFontes() {
  const resultados = await Promise.allSettled(FONTES.map((f) => buscarFonte(f)));
  const itens = [];
  for (const r of resultados) {
    if (r.status !== 'fulfilled') continue;
    const { fonte, itens: its, erro } = r.value;
    if (erro) console.warn(`  [falha] ${fonte.nome}: ${erro}`);
    else console.log(`  [ok] ${fonte.nome}: ${its.length} itens`);
    itens.push(...its);
  }
  return itens;
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  const temChave = !!process.env.GEMINI_API_KEY;
  if (!args.dryRun && !temChave) {
    console.warn('AVISO: GEMINI_API_KEY não definida. Nada será publicado nesta rodada (use --dry-run para só listar os clusters).');
    resumoDaRodada([]);
    return 0;
  }

  const index = await lerIndex(RAIZ);
  const portao = portaoDeRitmo(index.posts);
  if (portao.pular) {
    console.log(portao.mensagem);
    const arq = process.env.GITHUB_STEP_SUMMARY;
    if (arq) {
      try {
        appendFileSync(arq, `## Caderno HDL\n\n${portao.mensagem}\n`);
      } catch (e) {
        console.warn(`Não foi possível escrever o resumo do job: ${e.message}`);
      }
    }
    return 0;
  }
  console.log(`Buscando ${FONTES.length} fontes...`);
  const todos = await coletarFontes();
  const recentes = dentroDaJanela(todos, args.janelaHoras).filter((it) => !ehOferta(it.titulo));
  console.log(`${todos.length} itens coletados, ${recentes.length} dentro da janela de ${args.janelaHoras}h.`);

  const clusters = agrupar(recentes);
  const candidatos = clusters.filter((c) => !jaPublicado(c, index.posts));
  console.log(`${clusters.length} clusters, ${candidatos.length} ainda não publicados.`);

  if (args.dryRun) {
    console.log('\nRanking de clusters (dry-run):');
    candidatos.slice(0, 15).forEach((c, i) => {
      const fontes = [...new Set(c.itens.map((it) => it.fonteNome))].join(', ');
      console.log(`${String(i + 1).padStart(2)}. [${c.score.toFixed(2)}] (${c.nFontes} fonte(s)) ${c.titulo}\n      ${fontes}`);
    });
    console.log(`\nPróxima atualização prevista: ${proximaAtualizacao(new Date(), index.posts[0]?.publicadoEm)}`);
    return 0;
  }

  const publicados = [];
  // No máximo 3 chamadas de IA por rodada, para não queimar a cota diária gratuita.
  const maxTentativas = Math.min(args.max * 3, MAX_CHAMADAS_IA);
  let tentativas = 0;
  let posts = index.posts;
  const estado = { modelo: modeloPadrao() };

  try {
    validarConfig();
    for (const cluster of candidatos) {
      if (publicados.length >= args.max || tentativas >= maxTentativas) break;
      if (jaPublicado(cluster, posts)) continue; // pode ter se tornado duplicado durante a rodada
      tentativas++;
      console.log(`\n[${tentativas}/${maxTentativas}] Cluster: ${cluster.titulo} (score ${cluster.score})`);

      const fontes = await extrairCluster(cluster, { max: 3 });
      if (!fontes.length) {
        console.warn('  Sem texto utilizável nas fontes; pulando.');
        continue;
      }
      let r;
      let v;
      let reforco = false;
      let abortar = false;
      while (true) {
        r = await redigir(fontes, { estado, reforco });
        if (!r.ok) {
          console.warn(`  Falha na redação: ${r.motivo}`);
          abortar = true;
          break;
        }
        if (r.dados.pular === true) {
          console.log(`  IA pediu para pular: ${r.dados.motivoPular || '(sem motivo)'}`);
          abortar = true;
          break;
        }
        r.dados = repararMojibakeProfundo(r.dados);
        v = validar(r.dados, fontes.map((f) => f.texto));
        if (v.ok) break;
        console.warn(`  Validação reprovou: ${v.erros.join('; ')}`);
        // Sem acentos: uma nova tentativa no mesmo assunto, se ainda houver chamadas de IA.
        if (!reforco && v.erros.every((e) => e === MOTIVO_SEM_ACENTO) && tentativas < maxTentativas) {
          tentativas++;
          reforco = true;
          console.log(`  [${tentativas}/${maxTentativas}] Nova tentativa no mesmo assunto, reforçando a acentuação.`);
          continue;
        }
        abortar = true;
        break;
      }
      if (abortar) continue;
      let usadas = Array.isArray(r.dados.fontesUsadas) ? [...new Set(r.dados.fontesUsadas)].filter((i) => Number.isInteger(i) && i >= 0 && i < fontes.length) : [];
      if (!usadas.length) usadas = fontes.map((_, i) => i);
      const itensUsados = usadas.map((i) => fontes[i].item);

      const res = await publicarPost(RAIZ, {
        conteudo: v.post,
        fontes: itensUsados,
        modelo: r.modelo,
        destaque: cluster.score,
        chave: chaveDoCluster(cluster),
        entidades: [...new Set([...(cluster.entidades || []), ...entidadesDoTitulo(v.post.titulo)])],
        urls: cluster.urls,
      });
      posts = res.indice.posts;
      publicados.push({ titulo: v.post.titulo, categoria: v.post.categoria, fontes: [...new Set(itensUsados.map((i) => i.fonteNome))].join(', ') });
      console.log(`  Publicado: ${res.slug}`);
    }
  } catch (e) {
    if (e instanceof ErroRodada) {
      console.error(`ERRO: ${e.message}`);
      resumoDaRodada(publicados);
      return e.fatal ? 1 : 0;
    }
    throw e;
  }

  console.log(`\nRodada concluída: ${publicados.length} notícia(s) publicada(s) em ${tentativas} tentativa(s).`);
  resumoDaRodada(publicados);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error('Falha inesperada:', e);
      process.exit(1);
    },
  );
}
