import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandler } from '../_lib/http.js';
import { rota as rotaCurtir } from '../caderno/curtir.js';
import { rota as rotaComentarios } from '../caderno/comentarios.js';
import { rota as rotaDenunciar } from '../caderno/denunciar.js';
import { rota as rotaInteracoes } from '../caderno/interacoes.js';
import { rota as rotaResumo } from '../caderno/resumo.js';

// ---- Redis falso em memória ----
function criarRedisFalso() {
  const kv = new Map();
  const conj = (k) => (kv.has(k) ? kv.get(k) : kv.set(k, new Set()).get(k));
  const lista = (k) => (kv.has(k) ? kv.get(k) : kv.set(k, []).get(k));
  return {
    async get(k) { return kv.get(k) ?? null; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async incr(k) { const n = (kv.get(k) || 0) + 1; kv.set(k, n); return n; },
    async expire() { return 1; },
    async sadd(k, ...m) { const s = conj(k); let n = 0; for (const x of m) if (!s.has(x)) { s.add(x); n++; } return n; },
    async srem(k, ...m) { const s = conj(k); let n = 0; for (const x of m) if (s.delete(x)) n++; return n; },
    async sismember(k, m) { return conj(k).has(m) ? 1 : 0; },
    async scard(k) { return conj(k).size; },
    async smembers(k) { return [...conj(k)]; },
    async lpush(k, ...v) { const l = lista(k); l.unshift(...v); return l.length; },
    async ltrim(k, a, b) { kv.set(k, lista(k).slice(a, b + 1)); return 'OK'; },
    async lrange(k, a, b) { return lista(k).slice(a, b + 1); },
    async llen(k) { return lista(k).length; },
  };
}

function reqFalso({ method = 'GET', url = '/', query = {}, body, headers = {} } = {}) {
  const json = method === 'POST' ? { 'content-type': 'application/json' } : {};
  return { method, url, query, body, headers: { host: 'site.test', 'x-forwarded-for': '1.2.3.4', ...json, ...headers } };
}
function resFalso() {
  const r = { headers: {}, statusCode: 200, corpo: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (s) => { r.corpo = JSON.parse(s); };
  return r;
}
const fetchOk = async () => ({ ok: true, headers: { get: () => 'application/json' } });
const fetchHtml = async () => ({ ok: true, headers: { get: () => 'text/html' } });
const fetch404 = async () => ({ ok: false, headers: { get: () => 'text/html' } });

const SLUG = 'noticia-de-teste-20261125';
const V1 = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';
const V3 = '33333333-3333-4333-8333-333333333333';

async function chamar(rota, req, deps) {
  const res = resFalso();
  await criarHandler(rota, deps)(req, res);
  return res;
}
const nova = () => ({ redis: criarRedisFalso(), fetchFn: fetchOk });
const comentar = (deps, texto = 'Gostei muito da matéria', ip = '9.9.9.9') =>
  chamar(rotaComentarios, reqFalso({
    method: 'POST',
    headers: { 'x-forwarded-for': ip, 'x-visitante': V1 },
    body: { slug: SLUG, nome: 'Ana', texto, site: '', tempo: 9000 },
  }), deps);

test('curtir alterna e conta visitantes distintos', async () => {
  const deps = nova();
  const post = (v) => chamar(rotaCurtir, reqFalso({ method: 'POST', body: { slug: SLUG }, headers: { 'x-visitante': v } }), deps);
  let r = await post(V1);
  assert.deepEqual(r.corpo, { curtidas: 1, curtiu: true });
  r = await post(V2);
  assert.deepEqual(r.corpo, { curtidas: 2, curtiu: true });
  r = await post(V1);
  assert.deepEqual(r.corpo, { curtidas: 1, curtiu: false });
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('curtir sem visitante válido retorna 400', async () => {
  const r = await chamar(rotaCurtir, reqFalso({ method: 'POST', body: { slug: SLUG } }), nova());
  assert.equal(r.statusCode, 400);
});

test('cria e lista comentário; interacoes reflete curtida', async () => {
  const deps = nova();
  const c = await comentar(deps);
  assert.equal(c.statusCode, 201);
  assert.match(c.corpo.comentario.id, /^c_[A-Za-z0-9_-]{12}$/);
  await chamar(rotaCurtir, reqFalso({ method: 'POST', body: { slug: SLUG }, headers: { 'x-visitante': V1 } }), deps);
  const r = await chamar(rotaInteracoes, reqFalso({ query: { slug: SLUG }, headers: { 'x-visitante': V1 } }), deps);
  assert.equal(r.statusCode, 200);
  assert.equal(r.corpo.curtidas, 1);
  assert.equal(r.corpo.curtiu, true);
  assert.equal(r.corpo.comentarios.length, 1);
  assert.equal(r.corpo.comentarios[0].texto, 'Gostei muito da matéria');
  assert.equal(r.headers['content-type'], 'application/json; charset=utf-8');
});

test('comentário reprovado pela moderação retorna 400', async () => {
  const r = await comentar(nova(), 'veja www.golpe.com');
  assert.equal(r.statusCode, 400);
  assert.ok(r.corpo.erro);
});

test('3 denúncias distintas ocultam; repetida do mesmo visitante não conta', async () => {
  const deps = nova();
  const { corpo } = await comentar(deps);
  const id = corpo.comentario.id;
  const denunciar = (v, ip) => chamar(rotaDenunciar, reqFalso({
    method: 'POST', body: { slug: SLUG, id }, headers: { 'x-visitante': v, 'x-forwarded-for': ip },
  }), deps);

  assert.equal((await denunciar(V1, '1.1.1.1')).corpo.oculto, false);
  assert.equal((await denunciar(V1, '1.1.1.1')).corpo.oculto, false); // mesmo visitante
  assert.equal((await denunciar(V2, '2.2.2.2')).corpo.oculto, false);
  const ultimo = await denunciar(V3, '3.3.3.3');
  assert.deepEqual(ultimo.corpo, { ok: true, oculto: true });

  const r = await chamar(rotaInteracoes, reqFalso({ query: { slug: SLUG } }), deps);
  assert.equal(r.corpo.comentarios.length, 0);
});

test('denunciar comentário inexistente retorna 404', async () => {
  const r = await chamar(rotaDenunciar, reqFalso({
    method: 'POST', body: { slug: SLUG, id: 'c_aaaaaaaaaaaa' }, headers: { 'x-visitante': V1 },
  }), nova());
  assert.equal(r.statusCode, 404);
});

test('rate limit de comentários: 4º em 10 min retorna 429 com Retry-After', async () => {
  const deps = nova();
  for (let i = 0; i < 3; i++) assert.equal((await comentar(deps)).statusCode, 201);
  const r = await comentar(deps);
  assert.equal(r.statusCode, 429);
  assert.equal(r.corpo.erro, 'Muitas tentativas. Tente novamente em instantes.');
  assert.ok(Number(r.headers['retry-after']) >= 1);
  // outro IP não é afetado
  assert.equal((await comentar(deps, 'Outro comentário legal', '8.8.8.8')).statusCode, 201);
});

test('slug inválido retorna 400', async () => {
  const r = await chamar(rotaInteracoes, reqFalso({ query: { slug: '../etc/passwd' } }), nova());
  assert.equal(r.statusCode, 400);
});

test('slug inexistente retorna 404 (inclusive quando o rewrite devolve HTML)', async () => {
  for (const fetchFn of [fetch404, fetchHtml]) {
    const r = await chamar(rotaInteracoes, reqFalso({ query: { slug: SLUG } }), { redis: criarRedisFalso(), fetchFn });
    assert.equal(r.statusCode, 404);
    assert.equal(r.corpo.erro, 'Notícia não encontrada.');
  }
});

test('slug existente é cacheado no Redis', async () => {
  const redis = criarRedisFalso();
  let chamadas = 0;
  const fetchFn = async (...a) => { chamadas++; return fetchOk(...a); };
  for (let i = 0; i < 2; i++) await chamar(rotaInteracoes, reqFalso({ query: { slug: SLUG } }), { redis, fetchFn });
  assert.equal(chamadas, 1);
  assert.equal(await redis.get(`caderno:slug-ok:${SLUG}`), '1');
});

test('Redis ausente retorna 503', async () => {
  const r = await chamar(rotaInteracoes, reqFalso({ query: { slug: SLUG } }), { redis: null, fetchFn: fetchOk });
  assert.equal(r.statusCode, 503);
  assert.equal(r.corpo.erro, 'Interações indisponíveis no momento.');
});

test('método errado retorna 405 com Allow', async () => {
  const r = await chamar(rotaCurtir, reqFalso({ method: 'GET' }), nova());
  assert.equal(r.statusCode, 405);
  assert.equal(r.headers.allow, 'POST');
});

test('resumo retorna contagens e valida entrada', async () => {
  const deps = nova();
  await comentar(deps);
  await chamar(rotaCurtir, reqFalso({ method: 'POST', body: { slug: SLUG }, headers: { 'x-visitante': V1 } }), deps);
  const r = await chamar(rotaResumo, reqFalso({ query: { slugs: `${SLUG},outra-noticia-20261125` } }), deps);
  assert.deepEqual(r.corpo, {
    [SLUG]: { curtidas: 1, comentarios: 1 },
    'outra-noticia-20261125': { curtidas: 0, comentarios: 0 },
  });
  const muitos = Array.from({ length: 31 }, (_, i) => `slug-${i}`).join(',');
  assert.equal((await chamar(rotaResumo, reqFalso({ query: { slugs: muitos } }), deps)).statusCode, 400);
  assert.equal((await chamar(rotaResumo, reqFalso({ query: { slugs: 'Inválido!' } }), deps)).statusCode, 400);
});

test('corpo como string JSON é aceito e corpo grande é recusado', async () => {
  const deps = nova();
  const r = await chamar(rotaCurtir, reqFalso({
    method: 'POST', body: JSON.stringify({ slug: SLUG }), headers: { 'x-visitante': V1 },
  }), deps);
  assert.equal(r.statusCode, 200);
  const g = await chamar(rotaCurtir, reqFalso({
    method: 'POST', body: { slug: SLUG, lixo: 'x'.repeat(9000) }, headers: { 'x-visitante': V1 },
  }), deps);
  assert.equal(g.statusCode, 413);
});

test('POST com content-type não-JSON retorna 415', async () => {
  for (const ct of ['application/x-www-form-urlencoded', 'text/plain']) {
    for (const rota of [rotaComentarios, rotaCurtir, rotaDenunciar]) {
      const r = await chamar(rota, reqFalso({
        method: 'POST', body: `slug=${SLUG}`, headers: { 'content-type': ct, 'x-visitante': V1 },
      }), nova());
      assert.equal(r.statusCode, 415);
      assert.equal(r.corpo.erro, 'Formato de requisição inválido.');
    }
  }
});

test('comentar sem x-visitante retorna 400', async () => {
  const r = await chamar(rotaComentarios, reqFalso({
    method: 'POST', body: { slug: SLUG, nome: 'Ana', texto: 'Gostei muito da matéria', site: '', tempo: 9000 },
  }), nova());
  assert.equal(r.statusCode, 400);
});

test('3 visitantes do mesmo IP não ocultam; 3 IPs distintos ocultam', async () => {
  const deps = nova();
  const id = (await comentar(deps)).corpo.comentario.id;
  const denunciar = (v, ip) => chamar(rotaDenunciar, reqFalso({
    method: 'POST', body: { slug: SLUG, id }, headers: { 'x-visitante': v, 'x-forwarded-for': ip },
  }), deps);
  for (const v of [V1, V2, V3]) assert.equal((await denunciar(v, '5.5.5.5')).corpo.oculto, false);
  assert.equal((await denunciar(V1, '6.6.6.6')).corpo.oculto, false);
  assert.equal((await denunciar(V2, '7.7.7.7')).corpo.oculto, true);
});

test('4º visitante do mesmo IP curtindo o mesmo slug retorna 429; descurtir é permitido', async () => {
  const deps = nova();
  const V4 = '44444444-4444-4444-8444-444444444444';
  const post = (v) => chamar(rotaCurtir, reqFalso({ method: 'POST', body: { slug: SLUG }, headers: { 'x-visitante': v } }), deps);
  for (const v of [V1, V2, V3]) assert.equal((await post(v)).statusCode, 200);
  const r = await post(V4);
  assert.equal(r.statusCode, 429);
  assert.equal(r.corpo.erro, 'Muitas curtidas a partir desta rede.');
  const d = await post(V1);
  assert.equal(d.statusCode, 200);
  assert.deepEqual(d.corpo, { curtidas: 2, curtiu: false });
});
