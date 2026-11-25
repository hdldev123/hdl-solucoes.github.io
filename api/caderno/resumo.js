import { criarHandler } from '../_lib/http.js';
import { LIMITES } from '../_lib/limite.js';
import { slugValido } from '../_lib/slug.js';

const MAX_SLUGS = 30;

// Observação: a contagem de comentários usa LLEN e, por simplicidade, NÃO
// desconta os comentários ocultos por denúncia (diferença aceitável nos cards).
// Os slugs só têm o formato validado (sem checar existência) para evitar
// até 30 fetches por chamada; slugs inexistentes retornam zeros.
export async function processar({ redis, query }) {
  const lista = [...new Set(String(query.slugs || '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (lista.length === 0) return { status: 400, corpo: { erro: 'Informe ao menos uma notícia.' } };
  if (lista.length > MAX_SLUGS) {
    return { status: 400, corpo: { erro: `Informe no máximo ${MAX_SLUGS} notícias por vez.` } };
  }
  if (!lista.every(slugValido)) return { status: 400, corpo: { erro: 'Notícia inválida.' } };

  const pares = await Promise.all(
    lista.map(async (slug) => {
      const [curtidas, comentarios] = await Promise.all([
        redis.scard(`caderno:curtidas:${slug}`),
        redis.llen(`caderno:comentarios:${slug}`),
      ]);
      return [slug, { curtidas: curtidas || 0, comentarios: comentarios || 0 }];
    }),
  );
  return { status: 200, corpo: Object.fromEntries(pares) };
}

export const rota = {
  metodo: 'GET',
  acao: 'leitura',
  regras: LIMITES.leitura,
  precisaVisitante: false,
  usaSlug: false,
  processar,
};

export default criarHandler(rota);
