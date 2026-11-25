// Rate limit por janela fixa (INCR + EXPIRE).
// Chave: caderno:rl:{acao}:{ipHash}:{janelaSeg}:{indiceDaJanela}

export const LIMITES = {
  comentar: [
    { janela: 600, max: 3 },
    { janela: 86400, max: 20 },
  ],
  curtir: [{ janela: 60, max: 60 }],
  denunciar: [{ janela: 3600, max: 20 }],
  leitura: [{ janela: 60, max: 120 }],
};

export async function verificarLimite(redis, acao, ipHash, regras, agora = Date.now()) {
  const seg = Math.floor(agora / 1000);
  for (const { janela, max } of regras) {
    const indice = Math.floor(seg / janela);
    const chave = `caderno:rl:${acao}:${ipHash}:${janela}:${indice}`;
    const total = await redis.incr(chave);
    if (total === 1) await redis.expire(chave, janela + 5);
    if (total > max) {
      const retryAfter = Math.max(1, (indice + 1) * janela - seg);
      return { ok: false, retryAfter };
    }
  }
  return { ok: true };
}
