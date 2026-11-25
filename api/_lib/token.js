// Tokens assinados (HMAC-SHA256) para confirmar/cancelar a newsletter.
import { createHmac, timingSafeEqual } from 'node:crypto';

const PREFIXO = 'newsletter:v1:';
export const VALIDADE_MS = 48 * 60 * 60 * 1000;
const ACOES = ['assinar', 'cancelar'];

function chave(env) {
  return env.CADERNO_SALT || 'hdl-caderno-sal-padrao';
}

function assinar(payloadB64, env) {
  return createHmac('sha256', chave(env)).update(PREFIXO + payloadB64).digest('base64url');
}

export function gerarToken({ email, acao, agora = Date.now(), env = process.env }) {
  const payload = Buffer.from(JSON.stringify({ e: email, a: acao, x: agora + VALIDADE_MS })).toString('base64url');
  return `${payload}.${assinar(payload, env)}`;
}

// -> { email, acao } | { expirado: true } | null (inválido)
export function lerToken(token, agora = Date.now(), env = process.env) {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [payload, sig] = partes;
  const esperado = Buffer.from(assinar(payload, env));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  let dados;
  try {
    dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!dados || typeof dados.e !== 'string' || !ACOES.includes(dados.a) || typeof dados.x !== 'number') return null;
  if (agora > dados.x) return { expirado: true };
  return { email: dados.e, acao: dados.a };
}
