// Helpers HTTP e "cola" compartilhada pelos handlers.
import { createHash } from 'node:crypto';
import { obterRedis } from './redis.js';
import { verificarLimite } from './limite.js';
import { slugValido, visitanteValido, slugExiste } from './slug.js';

const LIMITE_CORPO = 8 * 1024;
const SAL_PADRAO = 'hdl-caderno-sal-padrao';
let avisouSal = false;

export function responder(res, status, corpo, extras = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extras)) res.setHeader(k, v);
  res.end(JSON.stringify(corpo));
}

export function extrairIp(req) {
  const h = req.headers || {};
  const xff = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || String(h['x-real-ip'] || '').trim() || req.socket?.remoteAddress || 'desconhecido';
}

// LGPD: o IP cru nunca é armazenado, somente este hash.
export function gerarIpHash(ip, env = process.env) {
  let sal = env.CADERNO_SALT;
  if (!sal) {
    if (!avisouSal) {
      avisouSal = true;
      console.warn('[caderno] CADERNO_SALT ausente: usando sal padrão (configure na Vercel).');
    }
    sal = SAL_PADRAO;
  }
  return createHash('sha256').update(ip + sal).digest('hex');
}

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Vercel já parseia req.body; tratamos string, objeto, Buffer ou ausente (stream).
export async function lerCorpo(req) {
  let b = req.body;
  if (b === undefined || b === null) {
    if (typeof req.on !== 'function') return {};
    const partes = [];
    let total = 0;
    for await (const p of req) {
      total += p.length;
      if (total > LIMITE_CORPO) throw new ErroHttp(413, 'Requisição grande demais.');
      partes.push(p);
    }
    b = Buffer.concat(partes).toString('utf8');
  }
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    if (Buffer.byteLength(b) > LIMITE_CORPO) throw new ErroHttp(413, 'Requisição grande demais.');
    if (!b.trim()) return {};
    try {
      b = JSON.parse(b);
    } catch {
      throw new ErroHttp(400, 'Corpo da requisição inválido.');
    }
  } else if (Buffer.byteLength(JSON.stringify(b) ?? '') > LIMITE_CORPO) {
    throw new ErroHttp(413, 'Requisição grande demais.');
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new ErroHttp(400, 'Corpo da requisição inválido.');
  return b;
}

function lerQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  try {
    return Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  } catch {
    return {};
  }
}

/**
 * Cria o handler de uma rota.
 * config: { metodo, acao, regras, precisaVisitante, usaSlug, processar }
 * processar({ redis, slug, visitante, corpo, query, ipHash, agora }) -> { status, corpo }
 * deps (testes): { redis, fetchFn, agora }
 */
export function criarHandler(config, deps = {}) {
  return async function handler(req, res) {
    try {
      if (req.method !== config.metodo) {
        return responder(res, 405, { erro: 'Método não permitido.' }, { Allow: config.metodo });
      }
      const redis = deps.redis !== undefined ? deps.redis : obterRedis();
      if (!redis) return responder(res, 503, { erro: 'Interações indisponíveis no momento.' });

      // Anti-CSRF: só JSON (força preflight CORS em requisições cross-site).
      if (config.metodo === 'POST' && !String(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) {
        return responder(res, 415, { erro: 'Formato de requisição inválido.' });
      }

      const ipHash = gerarIpHash(extrairIp(req));
      const lim = await verificarLimite(redis, config.acao, ipHash, config.regras, deps.agora);
      if (!lim.ok) {
        return responder(res, 429, { erro: 'Muitas tentativas. Tente novamente em instantes.' }, {
          'Retry-After': String(lim.retryAfter),
        });
      }

      const query = lerQuery(req);
      const corpo = config.metodo === 'POST' ? await lerCorpo(req) : {};

      const bruto = req.headers?.['x-visitante'];
      const visitante = visitanteValido(bruto) ? bruto : null;
      if (config.precisaVisitante && !visitante) {
        return responder(res, 400, { erro: 'Identificação do visitante inválida.' });
      }

      let slug = null;
      if (config.usaSlug) {
        slug = config.metodo === 'POST' ? corpo.slug : query.slug;
        if (!slugValido(slug)) return responder(res, 400, { erro: 'Notícia inválida.' });
        let existe;
        try {
          existe = await slugExiste(slug, req, redis, deps.fetchFn);
        } catch {
          return responder(res, 503, { erro: 'Não foi possível validar a notícia agora.' });
        }
        if (!existe) return responder(res, 404, { erro: 'Notícia não encontrada.' });
      }

      const r = await config.processar({ redis, slug, visitante, corpo, query, ipHash, agora: deps.agora });
      return responder(res, r.status, r.corpo);
    } catch (e) {
      if (e instanceof ErroHttp) return responder(res, e.status, { erro: e.message });
      console.error('[caderno] erro:', e?.message);
      return responder(res, 500, { erro: 'Erro interno. Tente novamente mais tarde.' });
    }
  };
}
