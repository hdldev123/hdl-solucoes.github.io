// Normalização de títulos, agrupamento em clusters, score "quente" e dedupe.
import { FONTES } from './fontes.mjs';

const STOPWORDS = new Set((
  // inglês
  'a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those ' +
  'he she they we you i his her their our your my not no new says say said will would could should can may might has have had ' +
  'do does did about after before over under into out up down more most than then so just now how why what when where who which ' +
  'also all any via vs per ' +
  // português
  'o os as um uma uns umas e ou mas de do da dos das em no na nos nas por para com sem sobre entre ate apos ' +
  'que se ao aos como mais menos ja ser foi sao sera tem ter tambem seu sua seus suas esse essa esses essas este esta estes estas ' +
  'novo nova novos novas diz'
).split(/\s+/));

const ENTIDADES_GENERICAS = new Set(('ai us uk eu ceo new how why what the ia weekly roundup review best top '+
  'january february march april may june july august september october november december '+
  'janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro '+
  'monday tuesday wednesday thursday friday saturday sunday segunda terca quarta quinta sexta sabado domingo').split(/\s+/));

export function semAcento(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizarTitulo(t) {
  return semAcento(String(t).toLowerCase())
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .replace(/(?<![0-9])\.|\.(?![0-9])/g, ' ')
    .replace(/(?<![a-z0-9])-|-(?![a-z0-9])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(titulo) {
  const out = new Set();
  for (const p of normalizarTitulo(titulo).split(' ')) {
    if (!p) continue;
    if (STOPWORDS.has(p)) continue;
    if (p.length < 2) continue;
    out.add(p);
  }
  return out;
}

/** Entidades: palavras capitalizadas (fora da 1ª posição), siglas, marcas com camel-case e números de versão. */
export function entidades(tituloOriginal) {
  const out = new Set();
  const palavras = String(tituloOriginal).split(/\s+/).filter(Boolean);
  palavras.forEach((w, idx) => {
    const limpa = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/['’]s$/i, '');
    if (!limpa) return;
    const norm = semAcento(limpa.toLowerCase());
    if (STOPWORDS.has(norm) || ENTIDADES_GENERICAS.has(norm)) return;
    const capitalizada = /^\p{Lu}/u.test(limpa);
    const sigla = /^\p{Lu}{2,}$/u.test(limpa);
    const camel = /\p{Ll}\p{Lu}/u.test(limpa);
    const comDigito = /\d/.test(limpa) && /[a-z]/i.test(limpa);
    const versao = /^\d+(\.\d+)+$/.test(limpa);
    if ((capitalizada && idx > 0) || sigla || camel || comDigito || versao) out.add(norm);
  });
  return out;
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function intersecao(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

export function similares(a, b) {
  if (jaccard(a.tokens, b.tokens) >= 0.3) return true;
  return intersecao(a.entidades, b.entidades) >= 2;
}

const HORA = 3600 * 1000;

export function dentroDaJanela(itens, janelaHoras = 30, agora = Date.now()) {
  return itens.filter((it) => {
    const t = Date.parse(it.publicadoEm);
    return Number.isFinite(t) && agora - t <= janelaHoras * HORA && t - agora < 2 * HORA;
  });
}

export function scoreCluster(itens, fontes = FONTES, agora = Date.now()) {
  const porFonte = new Map();
  for (const it of itens) {
    const f = fontes.find((x) => x.id === it.fonteId);
    const peso = f?.peso ?? 1;
    porFonte.set(it.fonteId, { peso: Math.max(peso, porFonte.get(it.fonteId)?.peso ?? 0), primaria: !!f?.primaria });
  }
  let soma = 0;
  let primaria = false;
  for (const v of porFonte.values()) {
    soma += v.peso;
    if (v.primaria) primaria = true;
  }
  const maisRecente = Math.max(...itens.map((it) => Date.parse(it.publicadoEm)));
  const horas = Math.max(0, (agora - maisRecente) / HORA);
  const score = 3 * porFonte.size + soma + (primaria ? 2 : 0) - 0.15 * horas;
  return Math.round(score * 100) / 100;
}

/** Agrupa itens em clusters (union-find sobre pares similares) e ordena por score desc. */
export function agrupar(itens, { fontes = FONTES, agora = Date.now() } = {}) {
  const info = itens.map((it) => ({ it, tokens: tokens(it.titulo), entidades: entidades(it.titulo) }));
  // Agrupamento guloso: o item entra no cluster se for similar à "semente" (1º item)
  // ou a ao menos 2 membros — evita o encadeamento de assuntos diferentes (single-link).
  const grupos = [];
  for (const x of info) {
    let alvo = null;
    for (const g of grupos) {
      const similaresN = g.filter((m) => similares(x, m)).length;
      if (similares(x, g[0]) || similaresN >= 2) {
        alvo = g;
        break;
      }
    }
    if (alvo) alvo.push(x);
    else grupos.push([x]);
  }
  const clusters = [];
  for (const membros of grupos) {
    const its = membros.map((m) => m.it);
    const fontesDistintas = [...new Set(its.map((i) => i.fonteId))];
    // ordem: fontes primárias e de maior peso primeiro, depois mais recente
    const peso = (it) => {
      const f = fontes.find((x) => x.id === it.fonteId);
      return (f?.primaria ? 10 : 0) + (f?.peso ?? 1);
    };
    its.sort((a, b) => peso(b) - peso(a) || Date.parse(b.publicadoEm) - Date.parse(a.publicadoEm));
    // tokens ordenados por frequência entre os títulos (estável pela ordem de inserção)
    const freq = new Map();
    membros.forEach((m) => m.tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
    const tkOrdenados = [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a));
    const ents = new Set();
    membros.forEach((m) => m.entidades.forEach((e) => ents.add(e)));
    clusters.push({
      titulo: its[0].titulo,
      itens: its,
      nFontes: fontesDistintas.length,
      score: scoreCluster(its, fontes, agora),
      tokens: tkOrdenados,
      entidades: [...ents],
      urls: [...new Set(its.map((i) => i.url))],
      titulosTokens: membros.map((m) => [...m.tokens]),
    });
  }
  clusters.sort((a, b) => b.score - a.score);
  return clusters;
}

/** Chave interna gravada no index.json (tokens normalizados dos títulos de origem). */
export function chaveDoCluster(cluster, max = 24) {
  return cluster.tokens.slice(0, max);
}

// Entidades de uma palavra só, comuns demais para identificar uma história sozinhas.
const ENTIDADES_BIG_TECH = new Set(('google apple microsoft openai ai ia meta amazon samsung nvidia anthropic ' +
  'tesla intel amd ibm oracle netflix xiaomi huawei sony github android windows chatgpt youtube whatsapp instagram').split(/\s+/));

const JANELA_DEDUPE_H = 72;

/** Entidade "forte": contém dígito (versão/modelo), ex.: gpt-6, ios-19, m5. */
export function entidadeForte(e) {
  return /\d/.test(e);
}

/** Coeficiente de contenção |A∩B| / min(|A|,|B|) e tamanho da interseção. */
function contencao(a, b) {
  if (!a.size || !b.size) return { c: 0, n: 0 };
  const n = intersecao(a, b);
  return { c: n / Math.min(a.size, b.size), n };
}

/** Entidades normalizadas (minúsculas, sem acento) de um título. */
export function entidadesDoTitulo(titulo) {
  return [...entidades(titulo)];
}

/**
 * true se o cluster conta a mesma história de algum post das últimas 72h.
 * Regras (qualquer uma): URL em comum; >=1 entidade forte em comum; >=2 entidades em comum
 * (com ao menos uma que não seja só nome de big tech, ou contenção de tokens >= 0,35);
 * contenção de tokens >= 0,5 com >= 3 tokens em comum.
 * `agora` pode ser número (ms) ou { agora }.
 */
export function jaPublicado(cluster, postsIndex, agora = Date.now()) {
  if (agora && typeof agora === 'object') agora = agora.agora ?? Date.now();
  const limite = agora - JANELA_DEDUPE_H * HORA;
  const urlsCluster = new Set([...(cluster.urls || []), ...cluster.itens.map((it) => it.url)]);
  const entCluster = new Set(cluster.entidades || []);
  const titulos = (cluster.titulosTokens || []).map((t) => new Set(t));
  if (!titulos.length) titulos.push(new Set(cluster.tokens || []));
  for (const p of postsIndex || []) {
    const t = Date.parse(p.publicadoEm);
    if (!Number.isFinite(t) || t < limite) continue;
    const urlsPost = p.urls?.length ? p.urls : (p.fontes || []).map((f) => f.url);
    if (urlsPost.some((u) => urlsCluster.has(u))) return true;
    const chave = new Set(p.chave || []);
    let melhor = 0;
    let melhorN = 0;
    for (const tk of titulos) {
      const { c, n } = contencao(tk, chave);
      if (c > melhor || (c === melhor && n > melhorN)) { melhor = c; melhorN = n; }
      if (c >= 0.5 && n >= 3) return true;
    }
    const comuns = (p.entidades || []).filter((e) => entCluster.has(e));
    if (comuns.some(entidadeForte)) return true;
    if (comuns.length >= 2) {
      if (comuns.some((e) => !ENTIDADES_BIG_TECH.has(e))) return true;
      if (melhor >= 0.35) return true;
    }
  }
  return false;
}

const RE_OFERTA = /\b(deals? (on|for)|best .* deals|on sale|black friday|cyber monday|cupom|cupons|desconto|descontos|promo[cç][aã]o|ofertas? (do dia|imperd\w*))\b|\d+% off/i;

/** Descarta itens de ofertas/compras, que não são notícia. */
export function ehOferta(titulo) {
  return RE_OFERTA.test(String(titulo));
}
