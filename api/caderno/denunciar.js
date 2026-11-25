import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';
import { RE_ID_COMENTARIO } from '../_lib/slug.js';
import { lerComentario } from './interacoes.js';

const LIMIAR_OCULTAR = 3;

export async function processar({ redis, slug, visitante, corpo, ipHash }) {
  const id = corpo.id;
  if (typeof id !== 'string' || !RE_ID_COMENTARIO.test(id)) {
    return { status: 400, corpo: { erro: 'Comentário inválido.' } };
  }
  const itens = await redis.lrange(`caderno:comentarios:${slug}`, 0, 499);
  const existe = (itens || []).some((i) => lerComentario(i)?.id === id);
  if (!existe) return { status: 404, corpo: { erro: 'Comentário não encontrado.' } };

  // 1 por visitante (SET de visitantes) e contagem por rede (SET de ipHash):
  // o UUID do cliente é forjável, então o limiar considera IPs distintos.
  await redis.sadd(`caderno:denuncias-visitantes:${slug}:${id}`, visitante);
  await redis.sadd(`caderno:denuncias:${slug}:${id}`, ipHash);
  const total = await redis.scard(`caderno:denuncias:${slug}:${id}`);
  if (total >= LIMIAR_OCULTAR) await redis.sadd(`caderno:ocultos:${slug}`, id);
  return { status: 200, corpo: { ok: true, oculto: total >= LIMIAR_OCULTAR } };
}

export const rota = {
  metodo: 'POST',
  acao: 'denunciar',
  regras: LIMITES.denunciar,
  precisaVisitante: true,
  usaSlug: true,
  processar,
};

export default criarHandler(rota);
