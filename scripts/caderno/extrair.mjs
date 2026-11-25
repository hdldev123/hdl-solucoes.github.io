// Extração do texto das matérias (Readability + linkedom), com fallback para o RSS.
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { USER_AGENT } from './rss.mjs';

export const LIMITE_CHARS = 12000;

export function extrairTextoDeHtml(html, url) {
  const { document } = parseHTML(html);
  // Readability usa documentURI para resolver links; linkedom não define, então só ignoramos.
  void url;
  const artigo = new Readability(document, { charThreshold: 200 }).parse();
  const texto = (artigo?.textContent || '').replace(/[ \t\f\v\u00A0]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return texto;
}

export async function extrairItem(item, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const fallback = (item.conteudo || item.resumo || '').slice(0, LIMITE_CHARS);
  try {
    const res = await fetchImpl(item.url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = (await res.text()).slice(0, 3_000_000);
    const texto = extrairTextoDeHtml(html, item.url);
    // Texto muito curto costuma ser paywall/erro: usa o maior entre extração e RSS.
    if (texto.length >= 400 && texto.length >= fallback.length * 0.6) {
      return { texto: texto.slice(0, LIMITE_CHARS), origem: 'html' };
    }
    return { texto: fallback, origem: 'rss' };
  } catch (e) {
    return { texto: fallback, origem: 'rss', erro: e?.message || String(e) };
  }
}

/** Extrai o texto de até `max` itens do cluster. Retorna as fontes numeradas para o redator. */
export async function extrairCluster(cluster, { max = 3, ...opts } = {}) {
  const escolhidos = cluster.itens.slice(0, max);
  const resultados = await Promise.all(escolhidos.map((it) => extrairItem(it, opts)));
  return escolhidos
    .map((item, i) => ({ item, texto: resultados[i].texto, origem: resultados[i].origem, erro: resultados[i].erro }))
    .filter((f) => f.texto && f.texto.length >= 80);
}
