// Validação de slug/visitante e checagem de existência da notícia no próprio deploy.

export const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RE_VISITANTE = /^[0-9a-f-]{36}$/;
export const RE_ID_COMENTARIO = /^c_[A-Za-z0-9_-]{12}$/;

export function slugValido(slug) {
  return typeof slug === 'string' && slug.length >= 3 && slug.length <= 100 && RE_SLUG.test(slug);
}

export function visitanteValido(v) {
  return typeof v === 'string' && RE_VISITANTE.test(v);
}

const RE_HOST = /^[a-z0-9.-]+(?::\d{1,5})?$/i;

/**
 * Confere se /caderno/posts/{slug}.json existe no deploy atual. O positivo é
 * cacheado 1 dia no Redis. Lança erro se não for possível verificar (rede).
 * Obs.: o rewrite /caderno/* -> index.html responde 200 para arquivos
 * inexistentes, por isso exigimos Content-Type JSON.
 */
export async function slugExiste(slug, req, redis, fetchFn = globalThis.fetch) {
  const chave = `caderno:slug-ok:${slug}`;
  if (await redis.get(chave)) return true;

  const h = req.headers || {};
  const host = String(h.host || '').trim();
  if (!RE_HOST.test(host)) throw new Error('host inválido');
  const proto = String(h['x-forwarded-proto'] || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';

  const resp = await fetchFn(`${proto}://${host}/caderno/posts/${slug}.json`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  });
  const tipo = resp.headers?.get?.('content-type') || 'application/json';
  const existe = Boolean(resp.ok) && /json/i.test(tipo);
  if (existe) await redis.set(chave, '1', { ex: 86400 });
  return existe;
}
