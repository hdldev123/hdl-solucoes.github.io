// Busca e parse de feeds RSS 2.0 / Atom.
import { XMLParser } from 'fast-xml-parser';
import { hostnamePermitido } from './fontes.mjs';

export const USER_AGENT = 'CadernoHDL/1.0 (+https://hdl-solucoes-mu.vercel.app/caderno/)';

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

export function decodificarEntidades(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cod = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cod); } catch { return m; }
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}

export function limparHtml(s) {
  if (s == null) return '';
  let t = String(s);
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  t = t.replace(/<\/(p|div|li|h[1-6]|br)>|<br\s*\/?>/gi, '\n');
  t = t.replace(/<[^>]*>/g, ' ');
  t = decodificarEntidades(t);
  t = t.replace(/[ \t\f\v ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export function canonizarUrl(url) {
  try {
    const u = new URL(String(url).trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|cmpid$|ncid$)/i.test(k)) u.searchParams.delete(k);
    }
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

function texto(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return texto(v[0]);
  if (typeof v === 'object') return texto(v['#text'] ?? '');
  return '';
}

function arr(v) {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function linkAtom(link) {
  const ls = arr(link);
  const alt = ls.find((l) => typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate')) || ls[0];
  if (!alt) return '';
  return typeof alt === 'string' ? alt : alt['@_href'] || texto(alt);
}

function dataIso(v) {
  const t = texto(v).trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Faz o parse de um XML RSS/Atom e devolve itens normalizados (sem filtro de domínio). */
export function parseFeed(xml, fonte) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    processEntities: true,
    htmlEntities: true,
    trimValues: true,
  });
  const doc = parser.parse(xml);
  const itens = [];
  const brutos = [];
  if (doc?.rss?.channel) {
    for (const c of arr(doc.rss.channel)) brutos.push(...arr(c.item).map((i) => ({ tipo: 'rss', i })));
  } else if (doc?.feed) {
    brutos.push(...arr(doc.feed.entry).map((i) => ({ tipo: 'atom', i })));
  } else if (doc?.['rdf:RDF']) {
    brutos.push(...arr(doc['rdf:RDF'].item).map((i) => ({ tipo: 'rss', i })));
  }
  for (const { tipo, i } of brutos) {
    const titulo = limparHtml(texto(i.title));
    let link;
    let resumo;
    let conteudo = '';
    let data;
    if (tipo === 'rss') {
      link = texto(i.link) || (typeof i.guid === 'object' || typeof i.guid === 'string' ? texto(i.guid) : '');
      resumo = limparHtml(texto(i.description));
      conteudo = limparHtml(texto(i['content:encoded']));
      data = dataIso(i.pubDate) || dataIso(i['dc:date']);
    } else {
      link = linkAtom(i.link);
      resumo = limparHtml(texto(i.summary));
      conteudo = limparHtml(texto(i.content));
      data = dataIso(i.published) || dataIso(i.updated);
    }
    const url = canonizarUrl(link);
    if (!titulo || !url) continue;
    if (!resumo && conteudo) resumo = conteudo.slice(0, 500);
    itens.push({
      fonteId: fonte.id,
      fonteNome: fonte.nome,
      titulo,
      url,
      resumo: resumo.slice(0, 1500),
      conteudo: conteudo.slice(0, 20000),
      publicadoEm: data,
      idioma: fonte.idioma,
    });
  }
  return itens;
}

/** Descarta itens cujo hostname não pertence ao site da fonte e itens sem data. */
export function filtrarPorDominio(itens, fonte) {
  return itens.filter((it) => {
    try {
      return hostnamePermitido(new URL(it.url).hostname, fonte.site) && it.publicadoEm;
    } catch {
      return false;
    }
  });
}

export async function baixarFeed(fonte, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(fonte.feed, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Busca uma fonte; nunca lança. Retorna { fonte, itens, erro }. */
export async function buscarFonte(fonte, opts) {
  try {
    const xml = await baixarFeed(fonte, opts);
    const itens = filtrarPorDominio(parseFeed(xml, fonte), fonte);
    return { fonte, itens, erro: null };
  } catch (e) {
    return { fonte, itens: [], erro: e?.message || String(e) };
  }
}
