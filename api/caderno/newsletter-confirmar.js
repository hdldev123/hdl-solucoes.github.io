import { criarHandler } from '../_lib/http.js';
import { criarBrevo } from '../_lib/brevo.js';
import { lerToken } from '../_lib/token.js';

const DESTINO = '/caderno/?newsletter=';
let brevoPadrao;

export async function processar({ query, agora, deps = {} }) {
  const t = lerToken(query.t, agora);
  if (!t) return { location: `${DESTINO}erro` };
  if (t.expirado) return { location: `${DESTINO}expirada` };

  const brevo = deps.brevo || (brevoPadrao ||= criarBrevo());
  if (!brevo.configurado) return { location: `${DESTINO}erro` };
  try {
    const listId = await brevo.obterListaNewsletter();
    if (t.acao === 'assinar') {
      await brevo.adicionarContato(t.email, listId);
      return { location: `${DESTINO}confirmada` };
    }
    await brevo.removerContato(t.email, listId);
    return { location: `${DESTINO}cancelada` };
  } catch (e) {
    console.error('[caderno] newsletter-confirmar:', e?.status, e?.code);
    return { location: `${DESTINO}erro` };
  }
}

export const rota = {
  metodo: 'GET',
  acao: 'newsletter-confirmar',
  regras: [{ janela: 60, max: 30 }],
  precisaVisitante: false,
  processar,
};

export default criarHandler(rota);
