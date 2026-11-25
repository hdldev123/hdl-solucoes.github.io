import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';

export function lerComentario(item) {
  if (item && typeof item === 'object') return item; // Upstash já desserializa JSON
  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
}

export async function processar({ redis, slug, visitante }) {
  const [curtidas, curtiu, itens, ocultos] = await Promise.all([
    redis.scard(`caderno:curtidas:${slug}`),
    visitante ? redis.sismember(`caderno:curtidas:${slug}`, visitante) : 0,
    redis.lrange(`caderno:comentarios:${slug}`, 0, 199),
    redis.smembers(`caderno:ocultos:${slug}`),
  ]);
  const oculto = new Set(ocultos || []);
  const comentarios = (itens || [])
    .map(lerComentario)
    .filter((c) => c && c.id && !oculto.has(c.id))
    .map(({ id, nome, texto, criadoEm }) => ({ id, nome, texto, criadoEm }));
  return { status: 200, corpo: { curtidas: curtidas || 0, curtiu: Boolean(curtiu), comentarios } };
}

export const rota = {
  metodo: 'GET',
  acao: 'leitura',
  regras: LIMITES.leitura,
  precisaVisitante: false,
  usaSlug: true,
  processar,
};

export default criarHandler(rota);
