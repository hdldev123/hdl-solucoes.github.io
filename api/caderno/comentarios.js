import { randomBytes } from 'node:crypto';
import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';
import { moderarComentario, MSG_OFENSIVO } from '../_lib/moderacao.js';
import { revisarComIa } from '../_lib/moderacao-ia.js';

export async function processar({ redis, slug, corpo, deps = {} }) {
  const m = moderarComentario({
    nome: corpo.nome,
    texto: corpo.texto,
    site: corpo.site,
    tempo: corpo.tempo,
  });
  if (!m.ok) return { status: 400, corpo: { erro: m.erro } };

  // Camada 2 (opcional, fail-open): só roda se a camada 1 aprovou.
  const opcoesIa = {};
  if (deps.fetchIa) opcoesIa.fetch = deps.fetchIa;
  if ('chaveIa' in deps) opcoesIa.chave = deps.chaveIa;
  const ia = await revisarComIa(m.texto, opcoesIa);
  if (ia.ofensivo === true) return { status: 400, corpo: { erro: MSG_OFENSIVO } };

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
