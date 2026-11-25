import { criarHandler } from '../_lib/http.js';
import { criarBrevo, urlSite } from '../_lib/brevo.js';
import { gerarToken } from '../_lib/token.js';
import { emailConfirmarInscricao, emailConfirmarCancelamento } from '../_lib/emails-newsletter.js';

const MENSAGEM = 'Se o endereço for válido, você receberá um e-mail para confirmar.';
const RE_EMAIL = /^[^\s@<>"',;:()[\]\\]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export const REGRAS_NEWSLETTER = [
  { janela: 3600, max: 5 },
  { janela: 86400, max: 20 },
];

export function normalizarEmail(v) {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && RE_EMAIL.test(e) ? e : null;
}

let brevoPadrao;
const neutro = () => ({ status: 200, corpo: { ok: true, mensagem: MENSAGEM } });

export async function processar({ corpo, agora, deps = {} }) {
  const email = normalizarEmail(corpo.email);
  if (!email) return { status: 400, corpo: { erro: 'Informe um e-mail válido.' } };
  if (corpo.acao !== 'assinar' && corpo.acao !== 'cancelar') {
    return { status: 400, corpo: { erro: 'Ação inválida.' } };
  }
  // Honeypot preenchido ou envio rápido demais: resposta neutra, sem enviar nada.
  if ((typeof corpo.site === 'string' && corpo.site.trim()) || !(Number(corpo.tempo) >= 2000)) return neutro();

  const brevo = deps.brevo || (brevoPadrao ||= criarBrevo());
  if (!brevo.configurado) return { status: 503, corpo: { erro: 'Newsletter indisponível no momento.' } };

  const token = gerarToken({ email, acao: corpo.acao, agora });
  const link = `${urlSite()}/api/caderno/newsletter-confirmar?t=${encodeURIComponent(token)}`;
  const msg = corpo.acao === 'assinar' ? emailConfirmarInscricao({ link }) : emailConfirmarCancelamento({ link });
  try {
    await brevo.enviarTransacional({ para: email, assunto: msg.assunto, html: msg.html, texto: msg.texto, tags: ['newsletter-confirmacao'] });
  } catch (e) {
    // A mensagem do ErroBrevo já vem sem a chave; ajuda a diagnosticar remetente/domínio não verificado.
    console.error('[caderno] newsletter: falha ao enviar e-mail:', e?.status, e?.code, e?.message);
    if (e?.status === 429) return { status: 503, corpo: { erro: 'Newsletter indisponível no momento.' } };
    // Mantém a resposta neutra para não revelar nada sobre o endereço.
  }
  return neutro();
}

export const rota = {
  metodo: 'POST',
  acao: 'newsletter',
  regras: REGRAS_NEWSLETTER,
  precisaVisitante: true,
  processar,
};

export default criarHandler(rota);
