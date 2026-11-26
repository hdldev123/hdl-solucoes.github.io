// Validação do retorno da IA + checagem anti-plágio.
import { CATEGORIAS } from './redigir.mjs';
import { semAcento } from './agrupar.mjs';

export const JANELA_PLAGIO = 10;

export function palavrasNormalizadas(texto) {
  return semAcento(String(texto).toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function contarPalavras(texto) {
  return String(texto).split(/\s+/).filter(Boolean).length;
}

function ngramas(palavras, n) {
  const out = new Set();
  for (let i = 0; i + n <= palavras.length; i++) out.add(palavras.slice(i, i + n).join(' '));
  return out;
}

/** Retorna o primeiro trecho de `n` palavras idênticas entre `gerado` e qualquer texto de `fontes`, ou null. */
export function acharTrechoCopiado(gerado, fontes, n = JANELA_PLAGIO) {
  const base = new Set();
  for (const f of fontes) for (const g of ngramas(palavrasNormalizadas(f), n)) base.add(g);
  for (const campo of gerado) {
    const p = palavrasNormalizadas(campo);
    for (let i = 0; i + n <= p.length; i++) {
      const g = p.slice(i, i + n).join(' ');
      if (base.has(g)) return g;
    }
  }
  return null;
}

export const MOTIVO_SEM_ACENTO = 'texto sem acentuação (o modelo omitiu os acentos)';
export const MIN_ACENTUADOS_POR_100 = 2;
const RE_ACENTUADO = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/g;
export const MOTIVO_MOJIBAKE = 'texto com caracteres corrompidos (codificação)';
// Al\u00E9m dos pares UTF-8 lidos como Latin-1, pega o "\u00C3" \u00F3rf\u00E3o (o 2\u00BA byte se perdeu):
// sozinho antes de espa\u00E7o/fim ("atender \u00C3 demanda") ou colado a min\u00FAsculas ("ser\u00C3n").
// Em portugu\u00EAs, "\u00C3" leg\u00EDtimo s\u00F3 aparece em palavras todas em mai\u00FAsculas ("S\u00C3O").
const FONTE_MOJIBAKE = String.raw`[\xC3\xC2][\x80-\xBF]|\xE2\u20AC|\xC3(?=\s|$)|(?<=\p{Ll})\xC3|\xC3(?=\p{Ll})`;
export const RE_MOJIBAKE = new RegExp(FONTE_MOJIBAKE, 'u');
const RE_MOJIBAKE_G = new RegExp(FONTE_MOJIBAKE, 'gu');

/** Acentuados por 100 palavras no texto informado (0 se não houver palavras). */
export function acentuadosPor100(textos) {
  const juntos = textos.join(' ');
  const palavras = contarPalavras(juntos);
  if (!palavras) return 0;
  const limpo = juntos.replace(RE_MOJIBAKE_G, '');
  return ((limpo.match(RE_ACENTUADO) || []).length / palavras) * 100;
}

const RE_HTML = /</;
const RE_MD_NEGRITO = /\*\*|__/;
const RE_MD_TITULO = /^\s{0,3}#{1,6}\s/m;
const RE_MD_LINK = /\[[^\]]*\]\([^)]*\)/;
const RE_URL = /(https?:\/\/|www\.)\S+/i;
const RE_CRASE = /`/;
const RE_LISTA = /^\s*([-*•]|\d+[.)])\s+/m;

function textoLimpo(nome, s, erros) {
  if (typeof s !== 'string') {
    erros.push(`${nome}: não é texto`);
    return '';
  }
  const t = s.replace(/\s+/g, ' ').trim();
  if (RE_HTML.test(t)) erros.push(`${nome}: contém "<" (HTML)`);
  if (RE_MD_NEGRITO.test(t)) erros.push(`${nome}: contém Markdown (negrito)`);
  if (RE_CRASE.test(t)) erros.push(`${nome}: contém crase (Markdown)`);
  if (RE_MD_LINK.test(t)) erros.push(`${nome}: contém link Markdown`);
  if (RE_URL.test(t)) erros.push(`${nome}: contém link cru`);
  // verifica títulos/listas no texto original (com quebras de linha)
  if (RE_MD_TITULO.test(s)) erros.push(`${nome}: contém título Markdown (#)`);
  if (RE_LISTA.test(s)) erros.push(`${nome}: contém lista Markdown`);
  return t;
}

export const MAX_RESUMO = 320;
const MIN_RESUMO = 80;

/**
 * Resumo acima do limite é aparado em vez de reprovar a matéria inteira: corta no fim da
 * última frase que caiba (se sobrarem ao menos 80 caracteres) ou, senão, na última palavra
 * inteira, com reticências.
 */
export function apararResumo(resumo, max = MAX_RESUMO) {
  if (typeof resumo !== 'string' || resumo.length <= max) return resumo;
  const corte = resumo.slice(0, max);
  const fimFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  if (fimFrase + 1 >= MIN_RESUMO) return corte.slice(0, fimFrase + 1);
  if (/[.!?]$/.test(corte) && corte.length >= MIN_RESUMO) return corte;
  const espaco = corte.slice(0, max - 1).lastIndexOf(' ');
  const base = (espaco >= MIN_RESUMO ? corte.slice(0, espaco) : corte.slice(0, max - 1)).replace(/[\s,;:.\-–—]+$/, '');
  return `${base}…`;
}

function checarTamanho(nome, s, min, max, erros) {
  if (s.length < min || s.length > max) erros.push(`${nome}: ${s.length} caracteres (esperado ${min}–${max})`);
}

/**
 * Valida o retorno da IA.
 * @param dados objeto JSON retornado
 * @param textosFontes array com os textos das fontes (para anti-plágio)
 * @returns { ok, erros, post } — `post` contém campos já limpos quando ok.
 */
export function validar(dados, textosFontes = []) {
  const erros = [];
  if (!dados || typeof dados !== 'object') return { ok: false, erros: ['retorno vazio'], post: null };

  const titulo = textoLimpo('titulo', dados.titulo, erros);
  const subtitulo = textoLimpo('subtitulo', dados.subtitulo, erros);
  const resumo = apararResumo(textoLimpo('resumo', dados.resumo, erros));
  checarTamanho('titulo', titulo, 20, 120, erros);
  checarTamanho('subtitulo', subtitulo, 40, 220, erros);
  checarTamanho('resumo', resumo, MIN_RESUMO, MAX_RESUMO, erros);

  if (!CATEGORIAS.includes(dados.categoria)) erros.push(`categoria inválida: ${dados.categoria}`);

  let tags = [];
  if (!Array.isArray(dados.tags)) erros.push('tags: não é lista');
  else {
    tags = [...new Set(dados.tags.map((t, i) => textoLimpo(`tags[${i}]`, t, erros).toLowerCase()).filter(Boolean))];
    if (tags.length < 2 || tags.length > 6) erros.push(`tags: ${tags.length} (esperado 2–6)`);
    if (tags.some((t) => t.length > 30)) erros.push('tags: tag com mais de 30 caracteres');
  }

  let pontosChave = [];
  if (!Array.isArray(dados.pontosChave)) erros.push('pontosChave: não é lista');
  else {
    pontosChave = dados.pontosChave.map((t, i) => textoLimpo(`pontosChave[${i}]`, t, erros)).filter(Boolean);
    if (pontosChave.length < 3 || pontosChave.length > 5) erros.push(`pontosChave: ${pontosChave.length} (esperado 3–5)`);
    if (pontosChave.some((p) => p.length > 260)) erros.push('pontosChave: ponto com mais de 260 caracteres');
  }

  const secoes = [];
  if (!Array.isArray(dados.secoes)) erros.push('secoes: não é lista');
  else {
    dados.secoes.forEach((s, i) => {
      const t = s && typeof s.titulo === 'string' ? textoLimpo(`secoes[${i}].titulo`, s.titulo, erros) : '';
      const ps = Array.isArray(s?.paragrafos) ? s.paragrafos.map((p, j) => textoLimpo(`secoes[${i}].paragrafos[${j}]`, p, erros)).filter(Boolean) : [];
      if (!ps.length) erros.push(`secoes[${i}]: sem parágrafos`);
      secoes.push({ titulo: t || null, paragrafos: ps });
    });
    if (secoes.length < 2) erros.push(`secoes: ${secoes.length} (esperado ao menos 2)`);
    secoes.forEach((s, i) => {
      if (i > 0 && !s.titulo) erros.push(`secoes[${i}]: sem intertítulo`);
    });
  }

  const porQueImporta = textoLimpo('porQueImporta', dados.porQueImporta, erros);
  if (!porQueImporta) erros.push('porQueImporta: vazio');

  const corpo = [...secoes.flatMap((s) => s.paragrafos), porQueImporta];
  const palavras = corpo.reduce((n, p) => n + contarPalavras(p), 0);
  if (palavras < 350 || palavras > 1500) erros.push(`texto: ${palavras} palavras (esperado 350–1500)`);

  const todos = [titulo, subtitulo, resumo, ...tags, ...pontosChave, ...secoes.map((s) => s.titulo || ''), ...corpo];
  if (todos.some((t) => RE_MOJIBAKE.test(t))) erros.push(MOTIVO_MOJIBAKE);

  if (palavras >= 350 && acentuadosPor100([titulo, subtitulo, resumo, ...pontosChave, ...secoes.map((s) => s.titulo || ''), ...corpo]) < MIN_ACENTUADOS_POR_100) {
    erros.push(MOTIVO_SEM_ACENTO);
  }

  if (!erros.length && textosFontes.length) {
    const trecho = acharTrechoCopiado([titulo, subtitulo, resumo, ...pontosChave, ...corpo], textosFontes);
    if (trecho) erros.push(`anti-plágio: sequência de ${JANELA_PLAGIO}+ palavras idênticas a uma fonte ("${trecho}")`);
  }

  if (erros.length) return { ok: false, erros, post: null };
  return {
    ok: true,
    erros: [],
    post: { titulo, subtitulo, resumo, categoria: dados.categoria, tags, pontosChave, secoes, porQueImporta, palavras },
  };
}
