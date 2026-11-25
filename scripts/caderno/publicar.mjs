// Gravação dos posts e do índice em public/caderno/.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { semAcento } from './agrupar.mjs';

export const MAX_POSTS_INDEX = 300;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Grade de publicação em horário de Brasília (UTC-3): 06, 10, 14, 18, 22 => UTC 09, 13, 17, 21, 01 (minuto 07).
const HORAS_UTC_GRADE = [1, 9, 13, 17, 21];
const MINUTO_GRADE = 7;

function yyyymmddBrt(data) {
  const brt = new Date(data.getTime() - 3 * 3600 * 1000);
  return brt.toISOString().slice(0, 10).replace(/-/g, '');
}

export function gerarSlug(titulo, data = new Date()) {
  let base = semAcento(String(titulo).toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length > 70) {
    base = base.slice(0, 70);
    const corte = base.lastIndexOf('-');
    if (corte >= 30) base = base.slice(0, corte);
    base = base.replace(/-+$/g, '');
  }
  if (!base) base = 'noticia';
  return `${base}-${yyyymmddBrt(data)}`;
}

export function proximaAtualizacao(agora = new Date()) {
  const t = agora.getTime();
  const inicioDia = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  for (let dia = 0; dia <= 1; dia++) {
    for (const h of HORAS_UTC_GRADE) {
      const c = inicioDia + dia * 86400000 + h * 3600000 + MINUTO_GRADE * 60000;
      if (c > t) return new Date(c).toISOString();
    }
  }
  /* istanbul ignore next */
  throw new Error('grade inválida');
}

export function tempoLeitura(palavras) {
  return Math.max(1, Math.ceil(palavras / 200));
}

export async function escreverJsonAtomico(arquivo, obj) {
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, arquivo);
}

export async function lerIndex(raiz) {
  const arquivo = path.join(raiz, 'index.json');
  try {
    const idx = JSON.parse(await fs.readFile(arquivo, 'utf8'));
    if (!Array.isArray(idx.posts)) idx.posts = [];
    return idx;
  } catch (e) {
    if (e.code === 'ENOENT') return { versao: 1, atualizadoEm: null, proximaAtualizacao: null, posts: [] };
    throw e;
  }
}

async function existe(arquivo) {
  try {
    await fs.access(arquivo);
    return true;
  } catch {
    return false;
  }
}

/**
 * Grava o post e atualiza o índice.
 * @param raiz diretório public/caderno
 * @param p { conteudo (campos validados), fontes (itens do cluster usados), modelo, destaque, chave }
 */
export async function publicarPost(raiz, p, agora = new Date()) {
  const idx = await lerIndex(raiz);
  let slug = gerarSlug(p.conteudo.titulo, agora);
  const usados = new Set(idx.posts.map((x) => x.slug));
  let n = 2;
  const base = slug;
  while (usados.has(slug) || (await existe(path.join(raiz, 'posts', `${slug}.json`)))) slug = `${base}-${n++}`;
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 100) throw new Error(`slug inválido: ${slug}`);

  const iso = agora.toISOString();
  const c = p.conteudo;
  const lei = tempoLeitura(c.palavras);
  const post = {
    versao: 1,
    slug,
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    resumo: c.resumo,
    categoria: c.categoria,
    tags: c.tags,
    publicadoEm: iso,
    atualizadoEm: iso,
    tempoLeitura: lei,
    palavras: c.palavras,
    pontosChave: c.pontosChave,
    secoes: c.secoes,
    porQueImporta: c.porQueImporta,
    fontes: p.fontes.map((f) => ({ nome: f.fonteNome, url: f.url, titulo: f.titulo, publicadoEm: f.publicadoEm, idioma: f.idioma })),
    geracao: { modelo: p.modelo, metodo: 'ia-a-partir-de-fontes', geradoEm: iso },
  };
  await escreverJsonAtomico(path.join(raiz, 'posts', `${slug}.json`), post);

  idx.posts.push({
    slug,
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    resumo: c.resumo,
    categoria: c.categoria,
    tags: c.tags,
    publicadoEm: iso,
    tempoLeitura: lei,
    destaque: p.destaque,
    fontes: p.fontes.map((f) => ({ nome: f.fonteNome, url: f.url })),
    chave: p.chave,
    // campos internos (dedupe); o front ignora
    entidades: p.entidades || [],
    urls: p.urls || [],
  });
  idx.posts.sort((a, b) => Date.parse(b.publicadoEm) - Date.parse(a.publicadoEm));
  const removidos = idx.posts.splice(MAX_POSTS_INDEX);
  for (const r of removidos) await fs.rm(path.join(raiz, 'posts', `${r.slug}.json`), { force: true });

  idx.versao = 1;
  idx.atualizadoEm = iso;
  idx.proximaAtualizacao = proximaAtualizacao(agora);
  await escreverJsonAtomico(path.join(raiz, 'index.json'), idx);
  return { slug, post, indice: idx };
}
