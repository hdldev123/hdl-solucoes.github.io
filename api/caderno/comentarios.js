import { randomBytes } from 'node:crypto';
import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';
import { moderarComentario } from '../_lib/moderacao.js';

export async function processar({ redis, slug, corpo }) {
  const m = moderarComentario({
    nome: corpo.nome,
    texto: corpo.texto,
    site: corpo.site,
    tempo: corpo.tempo,
  });
  if (!m.ok) return { status: 400, corpo: { erro: m.erro } };

  const comentario = {
    id: `c_${randomBytes(9).toString('base64url')}`, // 12 caracteres
    nome: m.nome,
    texto: m.texto,
    criadoEm: new Date().toISOString(),
  };
  const chave = `caderno:comentarios:${slug}`;
  await redis.lpush(chave, JSON.stringify(comentario));
  await redis.ltrim(chave, 0, 499);
  return { status: 201, corpo: { comentario } };
}

export const rota = {
  metodo: 'POST',
  acao: 'comentar',
  regras: LIMITES.comentar,
  precisaVisitante: true,
  usaSlug: true,
  processar,
};

export default criarHandler(rota);
