import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandler } from '../_lib/http.js';
import { revisarComIa } from '../_lib/moderacao-ia.js';
import { rota as rotaComentarios } from '../caderno/comentarios.js';
import { rota as rotaInteracoes } from '../caderno/interacoes.js';

const SLUG = 'noticia-de-teste-20261125';
const V1 = '11111111-1111-4111-8111-111111111111';
const CHAVE = 'CHAVE-SECRETA-123';

function redisFalso() {
  const kv = new Map();
  const g = (k, init) => (kv.has(k) ? kv.get(k) : kv.set(k, init()).get(k));
  return {
    async get(k) { return kv.get(k) ?? null; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async incr(k) { const n = (kv.get(k) || 0) + 1; kv.set(k, n); return n; },
    async expire() { return 1; },
    async sismember(k, m) { return g(k, () => new Set()).has(m) ? 1 : 0; },
    async scard(k) { return g(k, () => new Set()).size; },
    async smembers(k) { return [...g(k, () => new Set())]; },
    async lpush(k, ...v) { const l = g(k, () => []); l.unshift(...v); return l.length; },
    async ltrim(k, a, b) { kv.set(k, g(k, () => []).slice(a, b + 1)); return 'OK'; },
    async lrange(k, a, b) { return g(k, () => []).slice(a, b + 1); },
  };
}
const resFalso = () => {
  const r = { headers: {}, statusCode: 200, corpo: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (s) => { r.corpo = JSON.parse(s); };
  return r;
};
const fetchSlug = async () => ({ ok: true, headers: { get: () => 'application/json' } });
const resposta = (obj, { ok = true, status = 200, finishReason = 'STOP' } = {}) => async () => ({
  ok,
  status,
  json: async () => ({
    candidates: [{ finishReason, content: { parts: [{ thought: true, text: 'pensando' }, { text: JSON.stringify(obj) }] } }],
  }),
});

async function comentar(texto, deps) {
  const res = resFalso();
  await criarHandler(rotaComentarios, { redis: redisFalso(), fetchFn: fetchSlug, ...deps })({
    method: 'POST',
    url: '/',
    query: {},
    body: { slug: SLUG, nome: 'Ana', texto, site: '', tempo: 9000 },
    headers: { host: 'site.test', 'x-forwarded-for': '3.3.3.3', 'x-visitante': V1, 'content-type': 'application/json' },
  }, res);
  return res;
}

function capturarWarn() {
  const logs = [];
  const orig = console.warn;
  console.warn = (...a) => logs.push(a.join(' '));
  return { logs, restaurar: () => { console.warn = orig; } };
}

test('IA ofensivo:true -> 400 com a mensagem padrão', async () => {
  const r = await comentar('você é uma pessoa horrível e burra', { fetchIa: resposta({ ofensivo: true, motivo: 'insulto' }), chaveIa: CHAVE });
  assert.equal(r.statusCode, 400);
  assert.equal(r.corpo.erro, 'Seu comentário contém linguagem ofensiva. Reescreva sem palavrões.');
});

test('IA ofensivo:false -> salva; requisição montada corretamente', async () => {
  let chamada;
  const fetchIa = async (url, init) => { chamada = { url, init }; return resposta({ ofensivo: false, motivo: 'ok' })(); };
  const r = await comentar('Gostei muito da matéria', { fetchIa, chaveIa: CHAVE });
  assert.equal(r.statusCode, 201);
  assert.match(chamada.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(chamada.init.headers['x-goog-api-key'], CHAVE);
  assert.ok(!chamada.url.includes(CHAVE));
  const corpo = JSON.parse(chamada.init.body);
  assert.equal(corpo.generationConfig.responseMimeType, 'application/json');
  assert.equal(corpo.generationConfig.maxOutputTokens, 256);
  assert.match(corpo.contents[0].parts[0].text, /<comentario>\nGostei muito da matéria\n<\/comentario>/);
});

test('IA com erro/timeout/429/JSON inválido/finishReason ruim -> fail-open (salva)', async () => {
  const w = capturarWarn();
  try {
    const falhas = {
      rede: async () => { throw new Error(`falhou ${CHAVE}`); },
      http429: resposta({}, { ok: false, status: 429 }),
      jsonRuim: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'não é json' }] } }] }) }),
      formato: resposta({ outra: 1 }),
      corte: resposta({ ofensivo: true, motivo: 'x' }, { finishReason: 'MAX_TOKENS' }),
      timeout: (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abortado'), { name: 'AbortError' })))),
    };
    for (const [nome, fetchIa] of Object.entries(falhas)) {
      if (nome === 'timeout') continue; // coberto abaixo com timeout curto
      const r = await comentar('Gostei muito da matéria', { fetchIa, chaveIa: CHAVE });
      assert.equal(r.statusCode, 201, nome);
    }
    const direto = await revisarComIa('oi', { fetch: falhas.timeout, chave: CHAVE, timeoutMs: 10 });
    assert.deepEqual(direto, { ofensivo: null });
  } finally {
    w.restaurar();
  }
  assert.ok(w.logs.length >= 6);
  assert.ok(!w.logs.join('\n').includes(CHAVE), 'chave vazou em log');
});

test('sem chave -> não chama fetch', async () => {
  let n = 0;
  const fetchIa = async () => { n++; return resposta({ ofensivo: true, motivo: '' })(); };
  const r = await comentar('Gostei muito da matéria', { fetchIa, chaveIa: '' });
  assert.equal(r.statusCode, 201);
  assert.equal(await revisarComIa('oi', { fetch: fetchIa, chave: '' }).then((x) => x.ofensivo), null);
  assert.equal(n, 0);
});

test('camada 1 bloqueando -> IA não é chamada', async () => {
  let n = 0;
  const fetchIa = async () => { n++; return resposta({ ofensivo: false, motivo: '' })(); };
  const r = await comentar('que p o r r a de notícia', { fetchIa, chaveIa: CHAVE });
  assert.equal(r.statusCode, 400);
  assert.equal(n, 0);
});

test('interacoes oculta comentário antigo com palavrão', async () => {
  const redis = redisFalso();
  const antigo = (id, nome, texto) => JSON.stringify({ id, nome, texto, criadoEm: '2026-01-01T00:00:00Z' });
  await redis.lpush(`caderno:comentarios:${SLUG}`,
    antigo('c_1', 'Ana', 'Boa matéria'),
    antigo('c_2', 'Beto', 'que merda de notícia'),
    antigo('c_3', 'p.u.t.a', 'texto normal'),
    antigo('c_4', 'Caio', 'computador novo é bom'));
  const res = resFalso();
  await criarHandler(rotaInteracoes, { redis, fetchFn: fetchSlug })({
    method: 'GET', url: '/', query: { slug: SLUG },
    headers: { host: 'site.test', 'x-forwarded-for': '4.4.4.4' },
  }, res);
  assert.deepEqual(res.corpo.comentarios.map((c) => c.id).sort(), ['c_1', 'c_4']);
});
