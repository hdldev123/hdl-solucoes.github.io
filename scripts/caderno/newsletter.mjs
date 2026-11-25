// Resumo diário do Caderno HDL por e-mail (Brevo). Roda no GitHub Actions às 07h03 BRT.
// Uso: node scripts/caderno/newsletter.mjs [--dry-run] [--saida=arquivo.html] [--forcar]
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { montarEmailResumo, partesBRT } from './email-resumo.mjs';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/caderno');
const MAX_POSTS = 5;
const JANELA_MS = 24 * 3600 * 1000;

export function lerArgs(argv) {
  const args = { dryRun: false, forcar: false, saida: '' };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--forcar') args.forcar = true;
    else if (a.startsWith('--saida=')) args.saida = a.slice(8);
  }
  return args;
}

const dois = (n) => String(n).padStart(2, '0');

export function nomeCampanha(agora) {
  const p = partesBRT(agora);
  return `Caderno HDL — resumo de ${dois(p.dia)}/${dois(p.mes)}/${p.ano}`;
}

/** Janela do dia em BRT: 00:00 BRT (= 03:00 UTC) até agora. */
export function janelaDoDia(agora) {
  const p = partesBRT(agora);
  return { inicio: new Date(Date.UTC(p.ano, p.mes - 1, p.dia, 3, 0, 0)), fim: agora };
}

export function selecionarPosts(posts, agora) {
  const limite = agora.getTime() - JANELA_MS;
  return (posts || [])
    .filter((p) => {
      const t = Date.parse(p.publicadoEm);
      return Number.isFinite(t) && t >= limite && t <= agora.getTime();
    })
    .sort((a, b) => (b.destaque || 0) - (a.destaque || 0))
    .slice(0, MAX_POSTS);
}

async function aviso(texto, env) {
  console.log(texto);
  if (env.GITHUB_STEP_SUMMARY) {
    try {
      await appendFile(env.GITHUB_STEP_SUMMARY, `${texto}\n\n`);
    } catch { /* resumo do job é opcional */ }
  }
}

export async function executarResumo({ brevo, agora = new Date(), raiz = RAIZ_PADRAO, args = {}, env = process.env, site } = {}) {
  const { dryRun = false, forcar = false, saida = '' } = args;
  const indice = JSON.parse(await readFile(path.join(raiz, 'index.json'), 'utf8'));
  const posts = selecionarPosts(indice.posts, agora);
  if (!posts.length) {
    await aviso('Newsletter: nenhuma notícia publicada nas últimas 24h. Nada a enviar.', env);
    return 0;
  }

  const base = site || env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://hdl-solucoes-mu.vercel.app');
  const email = montarEmailResumo({ posts, site: base.replace(/\/+$/, ''), data: agora });
  const nome = nomeCampanha(agora);

  if (dryRun) {
    if (saida) await writeFile(saida, email.html, 'utf8');
    await aviso(`Newsletter (dry-run): "${nome}" | assunto: ${email.assunto} | ${posts.length} notícia(s)${saida ? ` | HTML em ${saida}` : ''}`, env);
    return 0;
  }

  if (!brevo || !brevo.configurado) {
    await aviso('AVISO: BREVO_API_KEY não definida. Nada será enviado.', env);
    return 0;
  }

  try {
    if (!forcar) {
      const enviadas = await brevo.listarCampanhasEnviadas(janelaDoDia(agora));
      if (enviadas.some((c) => c.name === nome)) {
        await aviso(`Newsletter: "${nome}" já foi enviada hoje. Nada a fazer (use --forcar para reenviar).`, env);
        return 0;
      }
    }
    const listId = await brevo.obterListaNewsletter();
    const id = await brevo.criarCampanha({ nome, assunto: email.assunto, html: email.html, listId, previewText: email.previewText, tag: 'resumo-diario' });
    await brevo.enviarCampanhaAgora(id);
    await aviso(`Newsletter enviada: "${nome}" (campanha ${id}) com ${posts.length} notícia(s). Assunto: ${email.assunto}`, env);
    return 0;
  } catch (e) {
    const status = e?.status;
    if (status === 402 || status === 429) {
      await aviso(`AVISO: Brevo respondeu ${status} (${status === 402 ? 'sem créditos de envio' : 'limite de requisições'}). Resumo não enviado hoje.`, env);
      return 0;
    }
    if (status === 400 || status === 401 || status === 403) {
      console.error(`ERRO: Brevo respondeu ${status}${status === 401 ? ' (BREVO_API_KEY inválida)' : ''}: ${e.message}`);
      return 1;
    }
    console.error('ERRO ao enviar a newsletter:', e?.message || e);
    return 1;
  }
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  let brevo = null;
  if (!args.dryRun) {
    const { criarBrevo } = await import('../../api/_lib/brevo.js');
    brevo = criarBrevo();
  }
  return executarResumo({ brevo, args });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error('Falha inesperada:', e?.message || e);
      process.exit(1);
    },
  );
}
