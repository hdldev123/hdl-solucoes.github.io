import { useEffect, useState } from 'react';

export { proximaRodada } from './agenda.js';

export const CADERNO_BASE = (import.meta.env.VITE_CADERNO_BASE || '/caderno').replace(/\/+$/, '');

export const CATEGORIAS = {
  ia: 'Inteligência Artificial',
  seguranca: 'Segurança',
  desenvolvimento: 'Desenvolvimento',
  nuvem: 'Nuvem & Infra',
  hardware: 'Hardware',
  mobile: 'Mobile',
  negocios: 'Negócios & Startups',
  ciencia: 'Ciência & Espaço',
};

export function rotuloCategoria(id) {
  return CATEGORIAS[id] || 'Tecnologia';
}

/* ---------- Carregamento ---------- */

let indiceCache = null;
const postCache = new Map();

async function buscarJson(url) {
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
  if (resposta.status === 404) {
    const erro = new Error('Não encontrado');
    erro.status = 404;
    throw erro;
  }
  if (!resposta.ok) {
    const erro = new Error(`Falha ao carregar (${resposta.status})`);
    erro.status = resposta.status;
    throw erro;
  }
  const tipo = resposta.headers.get('content-type') || '';
  // Em dev/SPA fallback, um 404 pode vir como HTML com status 200.
  if (tipo && !tipo.includes('json')) {
    const erro = new Error('Resposta inesperada');
    erro.status = 404;
    throw erro;
  }
  return resposta.json();
}

export function carregarIndice({ forcar = false } = {}) {
  if (!indiceCache || forcar) {
    indiceCache = buscarJson(`${CADERNO_BASE}/index.json`)
      .then((dados) => ({
        ...dados,
        posts: Array.isArray(dados?.posts) ? dados.posts : [],
      }))
      .catch((erro) => {
        indiceCache = null;
        throw erro;
      });
  }
  return indiceCache;
}

export function carregarPost(slug) {
  if (!postCache.has(slug)) {
    postCache.set(
      slug,
      buscarJson(`${CADERNO_BASE}/posts/${encodeURIComponent(slug)}.json`).catch((erro) => {
        postCache.delete(slug);
        throw erro;
      }),
    );
  }
  return postCache.get(slug);
}

/** Hook: { estado: 'carregando'|'ok'|'erro', indice, recarregar } */
export function useIndice() {
  const [estado, setEstado] = useState({ estado: 'carregando', indice: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    carregarIndice({ forcar: tentativa > 0 })
      .then((indice) => { if (!cancelado) setEstado({ estado: 'ok', indice }); })
      .catch(() => { if (!cancelado) setEstado({ estado: 'erro', indice: null }); });
    return () => { cancelado = true; };
  }, [tentativa]);

  const recarregar = () => {
    setEstado({ estado: 'carregando', indice: null });
    setTentativa((n) => n + 1);
  };

  return { ...estado, recarregar };
}

/* ---------- Rotas ---------- */

export function slugDaUrl(pathname) {
  const m = /^\/caderno\/([^/]+)\/?$/.exec(pathname || '');
  if (!m) return null;
  let slug;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return slug.length >= 3 && slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export const urlDoPost = (slug) => `/caderno/${slug}/`;
export const urlCanonica = (slug) => `${window.location.origin}/caderno/${slug}/`;

/* ---------- Datas ---------- */

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function dataRelativa(iso, agora = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const seg = Math.round((t - agora) / 1000);
  const abs = Math.abs(seg);
  if (abs < 60) return 'agora mesmo';
  if (abs < 3600) return rtf.format(Math.round(seg / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(seg / 86400), 'day');
  return fmtDataCurta.format(t);
}

export function dataAbsoluta(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : fmtData.format(t);
}

export function dataHoraAbsoluta(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : fmtDataHora.format(t);
}

/** "14h" ou "14h30" (horário de Brasília). */
export function horaCheia(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const [h, m] = fmtHora.format(t).split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/* ---------- Seleção ---------- */

/** Destaque: maior `destaque` das últimas 24h; senão o mais recente. */
export function escolherDestaque(posts) {
  if (!posts.length) return null;
  const limite = Date.now() - 24 * 3600 * 1000;
  const recentes = posts.filter((p) => Date.parse(p.publicadoEm) >= limite);
  if (recentes.length) {
    return recentes.reduce((a, b) => ((b.destaque ?? 0) > (a.destaque ?? 0) ? b : a));
  }
  return posts[0];
}

export function textoPlano(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* ---------- Metadados da página ---------- */

export function definirMeta(titulo, descricao) {
  document.title = titulo;
  if (descricao) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', descricao);
  }
}
