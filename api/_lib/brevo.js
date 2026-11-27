// Cliente mínimo da API do Brevo (fetch nativo). Nunca expõe a chave em erros.
const BASE = 'https://api.brevo.com/v3';
export const NOME_LISTA = 'Caderno HDL — Newsletter';
const NOME_PASTA = 'Caderno HDL';

export class ErroBrevo extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ErroBrevo';
    this.status = status;
    this.code = code;
  }
}

export function remetente(env = process.env) {
  return { name: 'Caderno HDL', email: env.CADERNO_REMETENTE_EMAIL || 'comunicacaohdl@hdlsolucoes.dev.br' };
}

export function urlSite(env = process.env) {
  const u = env.SITE_URL
    || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://hdl-solucoes-mu.vercel.app');
  return String(u).replace(/\/+$/, '');
}

export function criarBrevo({ apiKey = process.env.BREVO_API_KEY, fetch = globalThis.fetch, env = process.env } = {}) {
  let listaCache = null;

  function limpar(txt) {
    let t = String(txt ?? '');
    if (apiKey) t = t.split(apiKey).join('***');
    return t.slice(0, 300);
  }

  async function chamar(metodo, caminho, corpo) {
    if (!apiKey) throw new ErroBrevo(503, 'sem_chave', 'Brevo não configurado.');
    let resp;
    try {
      resp = await fetch(`${BASE}${caminho}`, {
        method: metodo,
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new ErroBrevo(0, 'rede', `Falha de rede ao chamar o Brevo: ${limpar(e?.message)}`);
    }
    if (resp.ok) {
      if (resp.status === 204) return {};
      try {
        return (await resp.json()) ?? {};
      } catch {
        return {};
      }
    }
    let dados = {};
    try {
      dados = (await resp.json()) ?? {};
    } catch { /* corpo vazio */ }
    const code = limpar(dados.code || (resp.status === 429 ? 'rate_limit' : 'erro'));
    const msg = limpar(dados.message || `Brevo respondeu ${resp.status}`);
    throw new ErroBrevo(resp.status, code, msg);
  }

  async function obterListaNewsletter() {
    if (listaCache) return listaCache;
    const fixa = Number(env.BREVO_LISTA_ID);
    if (Number.isInteger(fixa) && fixa > 0) return (listaCache = fixa);

    for (let offset = 0; offset < 1000; offset += 50) {
      const r = await chamar('GET', `/contacts/lists?limit=50&offset=${offset}`);
      const achada = (r.lists || []).find((l) => l.name === NOME_LISTA);
      if (achada) return (listaCache = achada.id);
      if ((r.lists || []).length < 50) break;
    }
    const pastas = await chamar('GET', '/contacts/folders?limit=50&offset=0');
    let pastaId = pastas.folders?.[0]?.id;
    if (pastaId === undefined) {
      pastaId = (await chamar('POST', '/contacts/folders', { name: NOME_PASTA })).id;
    }
    const nova = await chamar('POST', '/contacts/lists', { name: NOME_LISTA, folderId: pastaId });
    return (listaCache = nova.id);
  }

  return {
    configurado: Boolean(apiKey),
    obterListaNewsletter,
    async adicionarContato(email, listId) {
      await chamar('POST', '/contacts', { email, listIds: [listId], updateEnabled: true, emailBlacklisted: false });
    },
    async removerContato(email, listId) {
      try {
        await chamar('POST', `/contacts/lists/${listId}/contacts/remove`, { emails: [email] });
      } catch (e) {
        if (e instanceof ErroBrevo && (e.status === 404 || e.code === 'document_not_found')) return;
        throw e;
      }
    },
    async enviarTransacional({ para, assunto, html, texto, tags }) {
      const corpo = { sender: remetente(env), to: [{ email: para }], subject: assunto, htmlContent: html };
      if (texto) corpo.textContent = texto;
      if (tags) corpo.tags = tags;
      const r = await chamar('POST', '/smtp/email', corpo);
      return r.messageId;
    },
    // Sem `tag`: o plano atual do Brevo recusa campanhas com tag
    // ("You are not allowed to avail tag option for your campaign").
    async criarCampanha({ nome, assunto, html, listId, previewText }) {
      const corpo = { name: nome, subject: assunto, sender: remetente(env), htmlContent: html, recipients: { listIds: [listId] } };
      if (previewText) corpo.previewText = previewText;
      return (await chamar('POST', '/emailCampaigns', corpo)).id;
    },
    async enviarCampanhaAgora(id) {
      await chamar('POST', `/emailCampaigns/${id}/sendNow`);
    },
    async listarCampanhasEnviadas({ inicio, fim }) {
      const q = new URLSearchParams({
        type: 'classic', status: 'sent', startDate: inicio.toISOString(), endDate: fim.toISOString(),
        limit: '50', excludeHtmlContent: 'true',
      });
      const r = await chamar('GET', `/emailCampaigns?${q}`);
      return (r.campaigns || []).map((c) => ({ id: c.id, name: c.name, status: c.status, sentDate: c.sentDate }));
    },
  };
}
