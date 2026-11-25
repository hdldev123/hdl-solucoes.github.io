const TIMEOUT_MS = 8000;
const CHAVE_VISITANTE = 'hdl-caderno-visitante';
const CHAVE_CURTIDAS = 'hdl-caderno-curtidas';
const CHAVE_DENUNCIAS = 'hdl-caderno-denuncias';

export function lerPreferencia(chave) {
  try { return window.localStorage.getItem(chave); } catch { return null; }
}

export function gravarPreferencia(chave, valor) {
  try { window.localStorage.setItem(chave, valor); } catch { /* sem storage */ }
}

function uuidv4() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const b = window.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let visitanteMemoria = null;

export function obterVisitante() {
  const salvo = lerPreferencia(CHAVE_VISITANTE);
  if (salvo && /^[0-9a-f-]{36}$/.test(salvo)) return salvo;
  if (visitanteMemoria) return visitanteMemoria;
  visitanteMemoria = uuidv4();
  gravarPreferencia(CHAVE_VISITANTE, visitanteMemoria);
  return visitanteMemoria;
}

/** Retorna { ok:true, status, dados } ou { ok:false, status, erro, indisponivel }. */
async function chamar(caminho, { metodo = 'GET', corpo } = {}) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(`/api/caderno/${caminho}`, {
      method: metodo,
      signal: controle.signal,
      headers: {
        'x-visitante': obterVisitante(),
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let dados = null;
    const tipo = resposta.headers.get('content-type') || '';
    if (tipo.includes('json')) {
      try { dados = await resposta.json(); } catch { dados = null; }
    }
    if (!resposta.ok || dados === null) {
      return {
        ok: false,
        status: resposta.status,
        // Sem JSON (ex.: dev local sem /api), 404/5xx: serviço fora do ar.
        indisponivel: dados === null || resposta.status >= 500,
        erro: dados?.erro || (resposta.status === 429
          ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
          : 'Serviço indisponível no momento.'),
      };
    }
    return { ok: true, status: resposta.status, dados };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      indisponivel: true,
      erro: e?.name === 'AbortError' ? 'Tempo esgotado. Tente novamente.' : 'Sem conexão com o serviço.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export const buscarInteracoes = (slug) => chamar(`interacoes?slug=${encodeURIComponent(slug)}`);

export const buscarResumo = (slugs) =>
  chamar(`resumo?slugs=${slugs.slice(0, 30).map(encodeURIComponent).join(',')}`);

export const curtir = (slug) => chamar('curtir', { metodo: 'POST', corpo: { slug } });

export const comentar = ({ slug, nome, texto, site, tempo }) =>
  chamar('comentarios', { metodo: 'POST', corpo: { slug, nome, texto, site, tempo } });

export const denunciar = (slug, id) => chamar('denunciar', { metodo: 'POST', corpo: { slug, id } });

/* ---------- Fallback local ---------- */

function lerMapa(chave) {
  try { return JSON.parse(lerPreferencia(chave) || '{}') || {}; } catch { return {}; }
}

export function curtidaLocal(slug) {
  return Boolean(lerMapa(CHAVE_CURTIDAS)[slug]);
}

export function alternarCurtidaLocal(slug) {
  const mapa = lerMapa(CHAVE_CURTIDAS);
  if (mapa[slug]) delete mapa[slug]; else mapa[slug] = 1;
  gravarPreferencia(CHAVE_CURTIDAS, JSON.stringify(mapa));
  return Boolean(mapa[slug]);
}

export function jaDenunciou(id) {
  return Boolean(lerMapa(CHAVE_DENUNCIAS)[id]);
}

export function marcarDenuncia(id) {
  const mapa = lerMapa(CHAVE_DENUNCIAS);
  mapa[id] = 1;
  gravarPreferencia(CHAVE_DENUNCIAS, JSON.stringify(mapa));
}

/* ---------- Newsletter ---------- */

export const assinarNewsletter = ({ email, site = '', tempo = 0 }) =>
  chamar('newsletter', { metodo: 'POST', corpo: { email, acao: 'assinar', site, tempo } });

export const cancelarNewsletter = ({ email, site = '', tempo = 0 }) =>
  chamar('newsletter', { metodo: 'POST', corpo: { email, acao: 'cancelar', site, tempo } });
