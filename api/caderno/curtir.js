import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';

const MAX_VISITANTES_POR_IP = 3;

// Alterna (toggle) a curtida do visitante.
export async function processar({ redis, slug, visitante, ipHash }) {
  const chave = `caderno:curtidas:${slug}`;
  const jaCurtiu = Boolean(await redis.sismember(chave, visitante));
  if (jaCurtiu) await redis.srem(chave, visitante);
  else {
    // Limite por rede: no máximo 3 visitantes distintos por slug/ipHash por dia.
    const chaveIp = `caderno:curtidas-ip:${slug}:${ipHash}`;
    if (!(await redis.sismember(chaveIp, visitante))) {
      if ((await redis.scard(chaveIp)) >= MAX_VISITANTES_POR_IP) {
        return { status: 429, corpo: { erro: 'Muitas curtidas a partir desta rede.' } };
      }
      await redis.sadd(chaveIp, visitante);
      await redis.expire(chaveIp, 86400);
    }
    await redis.sadd(chave, visitante);
  }
  const curtidas = await redis.scard(chave);
  return { status: 200, corpo: { curtidas: curtidas || 0, curtiu: !jaCurtiu } };
}

export const rota = {
  metodo: 'POST',
  acao: 'curtir',
  regras: LIMITES.curtir,
  precisaVisitante: true,
  usaSlug: true,
  processar,
};

export default criarHandler(rota);
