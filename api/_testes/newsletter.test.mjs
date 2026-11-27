import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandler } from '../_lib/http.js';
import { criarBrevo, ErroBrevo, NOME_LISTA } from '../_lib/brevo.js';
import { gerarToken, lerToken, VALIDADE_MS } from '../_lib/token.js';
import { rota as rotaNewsletter, normalizarEmail } from '../caderno/newsletter.js';
import { rota as rotaConfirmar } from '../caderno/newsletter-confirmar.js';

process.env.SITE_URL = 'https://site.test';
process.env.CADERNO_SALT = 'sal-de-teste';
delete process.env.BREVO_LISTA_ID;

const CHAVE = 'xkeysib-segredo-123';
const V1 = '11111111-1111-4111-8111-111111111111';

function criarRedisFalso() {
  const kv = new Map();
  return {
    async get(k) { return kv.get(k) ?? null; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async incr(k) { const n = (kv.get(k) || 0) + 1; kv.set(k, n); return n; },
    async expire() { return 1; },
  };
}
function reqFalso({ method = 'GET', query = {}, body, headers = {} } = {}) {
  const json = method === 'POST' ? { 'content-type': 'application/json' } : {};
  return { method, url: '/', query, body, headers: { host: 'site.test', 'x-forwarded-for': '1.2.3.4', ...json, ...headers } };
}
function resFalso() {
  const r = { headers: {}, statusCode: 200, corpo: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (s) => { r.corpo = s ? JSON.parse(s) : null; };
  return r;
}
async function chamar(rota, req, deps) {
  const res = resFalso();
  await criarHandler(rota, deps)(req, res);
  return res;
}

// Fetch falso: registra chamadas e responde conforme roteiro { 'METODO /caminho': resposta | fn }.
function fetchFalso(roteiro = {}) {
  const chamadas = [];
  const fn = async (url, init = {}) => {
    const caminho = url.replace('https://api.brevo.com/v3', '');
    const chave = `${init.method} ${caminho.split('?')[0]}`;
    chamadas.push({ chave, caminho, headers: init.headers, corpo: init.body ? JSON.parse(init.body) : undefined });
    const r = roteiro[chave] ?? { status: 200, json: {} };
    const x = typeof r === 'function' ? r() : r;
    return { ok: x.status >= 200 && x.status < 300, status: x.status, json: async () => x.json ?? {} };
  };
  fn.chamadas = chamadas;
  return fn;
}
const brevoCom = (roteiro, extra = {}) => {
  const f = fetchFalso(roteiro);
  return { f, brevo: criarBrevo({ apiKey: CHAVE, fetch: f, env: { ...extra } }) };
};

const post = (body, deps, headers = { 'x-visitante': V1 }) =>
  chamar(rotaNewsletter, reqFalso({ method: 'POST', body, headers }), { redis: criarRedisFalso(), ...deps });
const corpoOk = { email: 'Ana@Exemplo.com ', acao: 'assinar', site: '', tempo: 5000 };

// ---------- token ----------
test('token: gera e lê', () => {
  const t = gerarToken({ email: 'a@b.co', acao: 'assinar', agora: 1000 });
  assert.deepEqual(lerToken(t, 2000), { email: 'a@b.co', acao: 'assinar' });
});
test('token: adulterado retorna null', () => {
  const t = gerarToken({ email: 'a@b.co', acao: 'assinar', agora: 1000 });
  const [p, s] = t.split('.');
  const outro = Buffer.from(JSON.stringify({ e: 'x@y.co', a: 'assinar', x: 9e15 })).toString('base64url');
  assert.equal(lerToken(`${outro}.${s}`), null);
  assert.equal(lerToken(`${p}.${s.slice(0, -2)}AA`), null);
  assert.equal(lerToken('lixo'), null);
  assert.equal(lerToken(undefined), null);
});
test('token: expirado', () => {
  const t = gerarToken({ email: 'a@b.co', acao: 'cancelar', agora: 1000 });
  assert.deepEqual(lerToken(t, 1000 + VALIDADE_MS + 1), { expirado: true });
});
test('token: ação errada é rejeitada e sal diferente invalida', () => {
  const payload = Buffer.from(JSON.stringify({ e: 'a@b.co', a: 'apagar', x: 9e15 })).toString('base64url');
  const t = gerarToken({ email: 'a@b.co', acao: 'assinar', agora: 1000 });
  assert.equal(lerToken(`${payload}.${t.split('.')[1]}`), null);
  assert.equal(lerToken(t, 2000, { CADERNO_SALT: 'outro' }), null);
});

// ---------- validação ----------
test('normalizarEmail', () => {
  assert.equal(normalizarEmail('  Ana@Exemplo.COM '), 'ana@exemplo.com');
  for (const ruim of ['', 'sem-arroba', 'a@b', 'a b@c.com', 'a@@c.com', null, 123, `${'a'.repeat(250)}@x.com`]) {
    assert.equal(normalizarEmail(ruim), null, String(ruim));
  }
});

// ---------- POST /newsletter ----------
test('POST: 415 sem JSON', async () => {
  const res = await chamar(rotaNewsletter, reqFalso({ method: 'POST', body: corpoOk, headers: { 'content-type': 'text/plain', 'x-visitante': V1 } }), { redis: criarRedisFalso() });
  assert.equal(res.statusCode, 415);
});
test('POST: 400 sem x-visitante', async () => {
  const res = await post(corpoOk, {}, {});
  assert.equal(res.statusCode, 400);
});
test('POST: 400 e-mail inválido', async () => {
  const { f, brevo } = brevoCom();
  const res = await post({ ...corpoOk, email: 'nada' }, { brevo });
  assert.equal(res.statusCode, 400);
  assert.equal(f.chamadas.length, 0);
});
test('POST: 503 sem chave do Brevo', async () => {
  const res = await post(corpoOk, { brevo: criarBrevo({ apiKey: '', fetch: fetchFalso() }) });
  assert.equal(res.statusCode, 503);
  assert.equal(res.corpo.erro, 'Newsletter indisponível no momento.');
});
test('POST: honeypot e tempo curto respondem 200 neutro sem enviar', async () => {
  const { f, brevo } = brevoCom();
  const a = await post({ ...corpoOk, site: 'http://spam' }, { brevo });
  const b = await post({ ...corpoOk, tempo: 500 }, { brevo });
  assert.equal(a.statusCode, 200);
  assert.equal(b.statusCode, 200);
  assert.equal(a.corpo.ok, true);
  assert.equal(f.chamadas.length, 0);
});
test('POST: assinar envia transacional com link e token válido', async () => {
  const { f, brevo } = brevoCom({ 'POST /smtp/email': { status: 201, json: { messageId: '<x>' } } });
  const res = await post(corpoOk, { brevo });
  assert.equal(res.statusCode, 200);
  assert.equal(f.chamadas.length, 1);
  const c = f.chamadas[0];
  assert.equal(c.chave, 'POST /smtp/email');
  assert.equal(c.headers['api-key'], CHAVE);
  assert.equal(c.corpo.sender.email, 'comunicacaohdl@hdlsolucoes.dev.br');
  assert.equal(c.corpo.sender.name, 'Caderno HDL');
  assert.deepEqual(c.corpo.to, [{ email: 'ana@exemplo.com' }]);
  assert.equal(c.corpo.subject, 'Confirme sua inscrição no Caderno HDL');
  const m = c.corpo.htmlContent.match(/https:\/\/site\.test\/api\/caderno\/newsletter-confirmar\?t=([^"&]+)/);
  assert.ok(m, 'link com token no html');
  assert.ok(c.corpo.textContent.includes('newsletter-confirmar?t='));
  assert.deepEqual(lerToken(decodeURIComponent(m[1])), { email: 'ana@exemplo.com', acao: 'assinar' });
});
test('POST: cancelar usa assunto próprio e resposta é igual à de assinar', async () => {
  const { f, brevo } = brevoCom({ 'POST /smtp/email': { status: 201, json: { messageId: 'm' } } });
  const a = await post(corpoOk, { brevo });
  const b = await post({ ...corpoOk, acao: 'cancelar' }, { brevo });
  assert.equal(f.chamadas[1].corpo.subject, 'Confirme o cancelamento do Caderno HDL');
  assert.deepEqual(a.corpo, b.corpo);
  assert.equal(a.corpo.mensagem, 'Se o endereço for válido, você receberá um e-mail para confirmar.');
});
test('POST: erro do Brevo mantém resposta neutra e não vaza a chave', async () => {
  const { brevo } = brevoCom({ 'POST /smtp/email': { status: 400, json: { code: 'invalid', message: `chave ${CHAVE} inválida` } } });
  const logs = [];
  const orig = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  let res;
  try { res = await post(corpoOk, { brevo }); } finally { console.error = orig; }
  assert.equal(res.statusCode, 200);
  assert.ok(!JSON.stringify(res.corpo).includes(CHAVE));
  assert.ok(!logs.join('\n').includes(CHAVE));
});
test('POST: 429 do Brevo vira 503 tratável', async () => {
  const { brevo } = brevoCom({ 'POST /smtp/email': { status: 429, json: {} } });
  const res = await post(corpoOk, { brevo });
  assert.equal(res.statusCode, 503);
});
test('POST: rate limit 5/hora por IP', async () => {
  const { brevo } = brevoCom({ 'POST /smtp/email': { status: 201, json: { messageId: 'm' } } });
  const deps = { redis: criarRedisFalso(), brevo, agora: 1_700_000_000_000 };
  const r = [];
  for (let i = 0; i < 6; i++) r.push(await chamar(rotaNewsletter, reqFalso({ method: 'POST', body: corpoOk, headers: { 'x-visitante': V1 } }), deps));
  assert.equal(r[4].statusCode, 200);
  assert.equal(r[5].statusCode, 429);
});

// ---------- GET /newsletter-confirmar ----------
const confirmar = (t, brevo, agora) =>
  chamar(rotaConfirmar, reqFalso({ query: { t } }), { redis: criarRedisFalso(), brevo, agora });

test('confirmar assinatura: POST /contacts com listIds e 302 confirmada', async () => {
  const { f, brevo } = brevoCom({ 'POST /contacts': { status: 201, json: { id: 1 } } }, { BREVO_LISTA_ID: '42' });
  const res = await confirmar(gerarToken({ email: 'ana@exemplo.com', acao: 'assinar' }), brevo);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/caderno/?newsletter=confirmada');
  const c = f.chamadas.find((x) => x.chave === 'POST /contacts');
  assert.deepEqual(c.corpo, { email: 'ana@exemplo.com', listIds: [42], updateEnabled: true, emailBlacklisted: false });
});
test('confirmar cancelamento: remove da lista e 302 cancelada', async () => {
  const { f, brevo } = brevoCom({ 'POST /contacts/lists/42/contacts/remove': { status: 201 } }, { BREVO_LISTA_ID: '42' });
  const res = await confirmar(gerarToken({ email: 'ana@exemplo.com', acao: 'cancelar' }), brevo);
  assert.equal(res.headers.location, '/caderno/?newsletter=cancelada');
  assert.deepEqual(f.chamadas[0].corpo, { emails: ['ana@exemplo.com'] });
});
test('cancelar contato inexistente (404) ainda é sucesso', async () => {
  const { brevo } = brevoCom({ 'POST /contacts/lists/42/contacts/remove': { status: 404, json: { code: 'document_not_found', message: 'x' } } }, { BREVO_LISTA_ID: '42' });
  const res = await confirmar(gerarToken({ email: 'ana@exemplo.com', acao: 'cancelar' }), brevo);
  assert.equal(res.headers.location, '/caderno/?newsletter=cancelada');
});
test('token expirado -> 302 expirada; inválido -> erro', async () => {
  const { f, brevo } = brevoCom();
  const t = gerarToken({ email: 'a@b.co', acao: 'assinar', agora: 1000 });
  const a = await confirmar(t, brevo, 1000 + VALIDADE_MS + 5);
  assert.equal(a.headers.location, '/caderno/?newsletter=expirada');
  const b = await confirmar('invalido', brevo);
  assert.equal(b.headers.location, '/caderno/?newsletter=erro');
  assert.equal(f.chamadas.length, 0);
});
test('erro do Brevo na confirmação -> 302 erro', async () => {
  const { brevo } = brevoCom({ 'POST /contacts': { status: 500, json: {} } }, { BREVO_LISTA_ID: '42' });
  const res = await confirmar(gerarToken({ email: 'a@b.co', acao: 'assinar' }), brevo);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/caderno/?newsletter=erro');
});
test('GET confirmar não exige x-visitante', async () => {
  const { brevo } = brevoCom({ 'POST /contacts': { status: 204 } }, { BREVO_LISTA_ID: '1' });
  const res = await confirmar(gerarToken({ email: 'a@b.co', acao: 'assinar' }), brevo);
  assert.equal(res.statusCode, 302);
});

// ---------- cliente Brevo ----------
test('obterListaNewsletter: usa BREVO_LISTA_ID sem chamar a API', async () => {
  const { f, brevo } = brevoCom({}, { BREVO_LISTA_ID: '7' });
  assert.equal(await brevo.obterListaNewsletter(), 7);
  assert.equal(f.chamadas.length, 0);
});
test('obterListaNewsletter: acha por nome e usa cache', async () => {
  const { f, brevo } = brevoCom({
    'GET /contacts/lists': { status: 200, json: { lists: [{ id: 1, name: 'Outra' }, { id: 9, name: NOME_LISTA }] } },
  });
  assert.equal(await brevo.obterListaNewsletter(), 9);
  assert.equal(await brevo.obterListaNewsletter(), 9);
  assert.equal(f.chamadas.length, 1);
});
test('obterListaNewsletter: cria pasta e lista quando não existem', async () => {
  const { f, brevo } = brevoCom({
    'GET /contacts/lists': { status: 200, json: { lists: [] } },
    'GET /contacts/folders': { status: 200, json: { folders: [] } },
    'POST /contacts/folders': { status: 201, json: { id: 3 } },
    'POST /contacts/lists': { status: 201, json: { id: 55 } },
  });
  assert.equal(await brevo.obterListaNewsletter(), 55);
  assert.deepEqual(f.chamadas.find((c) => c.chave === 'POST /contacts/folders').corpo, { name: 'Caderno HDL' });
  assert.deepEqual(f.chamadas.find((c) => c.chave === 'POST /contacts/lists').corpo, { name: NOME_LISTA, folderId: 3 });
});
test('obterListaNewsletter: usa a primeira pasta existente', async () => {
  const { f, brevo } = brevoCom({
    'GET /contacts/lists': { status: 200, json: { lists: [] } },
    'GET /contacts/folders': { status: 200, json: { folders: [{ id: 8, name: 'X' }] } },
    'POST /contacts/lists': { status: 201, json: { id: 56 } },
  });
  assert.equal(await brevo.obterListaNewsletter(), 56);
  assert.ok(!f.chamadas.some((c) => c.chave === 'POST /contacts/folders'));
  assert.equal(f.chamadas.find((c) => c.chave === 'POST /contacts/lists').corpo.folderId, 8);
});
test('erros do Brevo: 429 tratável e chave nunca aparece na mensagem', async () => {
  const { brevo } = brevoCom({ 'POST /contacts': { status: 429, json: { code: 'too_many', message: `limite para ${CHAVE}` } } });
  await assert.rejects(brevo.adicionarContato('a@b.co', 1), (e) => {
    assert.ok(e instanceof ErroBrevo);
    assert.equal(e.status, 429);
    assert.ok(!e.message.includes(CHAVE) && !String(e.code).includes(CHAVE));
    return true;
  });
});
test('criarCampanha não envia tag (plano do Brevo recusa) e devolve o id', async () => {
  const { f, brevo } = brevoCom({ 'POST /emailCampaigns': { status: 201, json: { id: 42 } } });
  const id = await brevo.criarCampanha({ nome: 'n', assunto: 's', html: '<p>h</p>', listId: 7, previewText: 'p', tag: 'x' });
  assert.equal(id, 42);
  const corpo = f.chamadas.find((c) => c.chave === 'POST /emailCampaigns').corpo;
  assert.equal('tag' in corpo, false);
  assert.deepEqual(corpo.recipients, { listIds: [7] });
  assert.equal(corpo.previewText, 'p');
});
test('erro de rede não vaza a chave', async () => {
  const brevo = criarBrevo({ apiKey: CHAVE, fetch: async () => { throw new Error(`falha com ${CHAVE}`); } });
  await assert.rejects(brevo.enviarTransacional({ para: 'a@b.co', assunto: 's', html: 'h' }), (e) => {
    assert.equal(e.status, 0);
    assert.ok(!e.message.includes(CHAVE));
    return true;
  });
});
