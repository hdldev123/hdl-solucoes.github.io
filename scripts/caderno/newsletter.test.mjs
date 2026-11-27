import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selecionarPosts, nomeCampanha, janelaDoDia, executarResumo, lerArgs } from './newsletter.mjs';
import { montarEmailResumo, esc } from './email-resumo.mjs';

const AGORA = new Date('2026-11-25T10:03:00.000Z');
const SITE = 'https://exemplo.test';

function post(i, extra = {}) {
  return {
    slug: `noticia-${i}-20261125`,
    titulo: `Notícia ${i}`,
    subtitulo: `Sub ${i}`,
    resumo: `Resumo da notícia ${i}.`,
    categoria: 'ia',
    publicadoEm: new Date(AGORA.getTime() - i * 3600 * 1000).toISOString(),
    tempoLeitura: 4,
    destaque: 10 + i,
    fontes: [{ nome: 'A', url: 'https://a.test' }, { nome: 'B', url: 'https://b.test' }],
    ...extra,
  };
}

async function raizCom(posts) {
  const dir = await mkdtemp(path.join(tmpdir(), 'newsletter-'));
  await writeFile(path.join(dir, 'index.json'), JSON.stringify({ versao: 1, posts }));
  return dir;
}

function brevoFalso({ enviadas = [], erro = null, configurado = true } = {}) {
  const chamadas = [];
  const reg = (nome, ret) => async (...a) => {
    chamadas.push([nome, ...a]);
    if (erro && nome === erro.em) throw erro.erro;
    return ret(...a);
  };
  return {
    configurado,
    chamadas,
    obterListaNewsletter: reg('obterListaNewsletter', () => 7),
    listarCampanhasEnviadas: reg('listarCampanhasEnviadas', () => enviadas),
    criarCampanha: reg('criarCampanha', () => 99),
    enviarCampanhaAgora: reg('enviarCampanhaAgora', () => undefined),
  };
}

const erroStatus = (status) => Object.assign(new Error(`falha ${status}`), { status });
const env = {};
const silenciar = () => {
  const { log, error } = console;
  console.log = () => {};
  console.error = () => {};
  return () => { console.log = log; console.error = error; };
};

test('seleciona só as últimas 24h, máx 5, por destaque desc', () => {
  const posts = [1, 2, 3, 4, 5, 6, 7].map((i) => post(i));
  posts.push(post(8, { publicadoEm: new Date(AGORA.getTime() - 25 * 3600 * 1000).toISOString(), destaque: 999 }));
  const sel = selecionarPosts(posts, AGORA);
  assert.equal(sel.length, 5);
  assert.deepEqual(sel.map((p) => p.destaque), [17, 16, 15, 14, 13]);
  assert.ok(!sel.some((p) => p.destaque === 999));
});

test('nenhum post nas últimas 24h: não chama o Brevo e sai 0', async () => {
  const raiz = await raizCom([post(1, { publicadoEm: '2026-11-20T00:00:00Z' })]);
  const brevo = brevoFalso();
  const fim = silenciar();
  const codigo = await executarResumo({ brevo, agora: AGORA, raiz, env, site: SITE });
  fim();
  assert.equal(codigo, 0);
  assert.equal(brevo.chamadas.length, 0);
});

test('envia: cria campanha com nome, assunto e previewText e dispara', async () => {
  const raiz = await raizCom([post(1), post(2), post(3)]);
  const brevo = brevoFalso();
  const fim = silenciar();
  const codigo = await executarResumo({ brevo, agora: AGORA, raiz, env, site: SITE });
  fim();
  assert.equal(codigo, 0);
  const criar = brevo.chamadas.find((c) => c[0] === 'criarCampanha')[1];
  assert.equal(criar.nome, 'Caderno HDL — resumo de 25/11/2026');
  assert.equal(criar.assunto, 'Caderno HDL: Notícia 3 e mais 2 notícias');
  assert.equal(criar.previewText, 'Resumo da notícia 3.');
  assert.equal(criar.listId, 7);
  assert.equal('tag' in criar, false, 'o plano do Brevo não permite tag em campanha');
  assert.deepEqual(brevo.chamadas.at(-1), ['enviarCampanhaAgora', 99]);
});

test('assunto no singular com uma notícia extra e sem sufixo com uma só', () => {
  const dois = montarEmailResumo({ posts: [post(2), post(1)], site: SITE, data: AGORA });
  assert.equal(dois.assunto, 'Caderno HDL: Notícia 2 e mais 1 notícia');
  const um = montarEmailResumo({ posts: [post(1)], site: SITE, data: AGORA });
  assert.equal(um.assunto, 'Caderno HDL: Notícia 1');
});

test('idempotência: campanha do dia já enviada não cria outra; --forcar ignora', async () => {
  const raiz = await raizCom([post(1)]);
  const enviadas = [{ id: 5, name: 'Caderno HDL — resumo de 25/11/2026', status: 'sent' }];
  const fim = silenciar();
  const a = brevoFalso({ enviadas });
  assert.equal(await executarResumo({ brevo: a, agora: AGORA, raiz, env, site: SITE }), 0);
  assert.ok(!a.chamadas.some((c) => c[0] === 'criarCampanha'));
  const b = brevoFalso({ enviadas });
  assert.equal(await executarResumo({ brevo: b, agora: AGORA, raiz, env, site: SITE, args: { forcar: true } }), 0);
  fim();
  assert.ok(b.chamadas.some((c) => c[0] === 'criarCampanha'));
  assert.ok(!b.chamadas.some((c) => c[0] === 'listarCampanhasEnviadas'));
});

test('HTML escapa conteúdo dinâmico (título com <script> e &)', () => {
  const ruim = post(1, { titulo: '<script>alert(1)</script> & "x"', resumo: '<img src=x onerror=1> & mais' });
  const { html } = montarEmailResumo({ posts: [ruim], site: SITE, data: AGORA });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;'));
  assert.equal(esc("a'b"), 'a&#39;b');
});

test('HTML tem {{ unsubscribe }}, "Cancelar pelo site" e links com slug + UTMs', () => {
  const { html } = montarEmailResumo({ posts: [post(1), post(2)], site: `${SITE}/`, data: AGORA });
  assert.ok(html.includes('href="{{ unsubscribe }}"'));
  assert.ok(html.includes('Cancelar pelo site'));
  assert.ok(html.includes(`${SITE}/caderno/?newsletter=cancelar`));
  const utm = 'utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=resumo-diario';
  assert.ok(html.includes(`${SITE}/caderno/noticia-1-20261125/?${utm}`));
  assert.ok(html.includes(`${SITE}/caderno/noticia-2-20261125/?${utm}`));
  assert.ok(html.includes(`${SITE}/caderno/?${utm}`));
  assert.ok(html.includes('quarta-feira, 25 de novembro de 2026'));
  assert.ok(html.includes('Inteligência Artificial'));
  assert.ok(!/<script/i.test(html));
});

test('402 e 429 saem 0 com aviso; 400/401/403 saem 1', async () => {
  const raiz = await raizCom([post(1)]);
  const fim = silenciar();
  for (const [status, esperado] of [[402, 0], [429, 0], [400, 1], [401, 1], [403, 1]]) {
    const brevo = brevoFalso({ erro: { em: 'criarCampanha', erro: erroStatus(status) } });
    const codigo = await executarResumo({ brevo, agora: AGORA, raiz, env, site: SITE });
    assert.equal(codigo, esperado, `status ${status}`);
  }
  const sendNow402 = brevoFalso({ erro: { em: 'enviarCampanhaAgora', erro: erroStatus(402) } });
  assert.equal(await executarResumo({ brevo: sendNow402, agora: AGORA, raiz, env, site: SITE }), 0);
  fim();
});

test('sem chave do Brevo: aviso e exit 0 sem chamar nada', async () => {
  const raiz = await raizCom([post(1)]);
  const brevo = brevoFalso({ configurado: false });
  const fim = silenciar();
  assert.equal(await executarResumo({ brevo, agora: AGORA, raiz, env, site: SITE }), 0);
  fim();
  assert.equal(brevo.chamadas.length, 0);
});

test('dry-run não chama o Brevo e grava o HTML em --saida', async () => {
  const raiz = await raizCom([post(1)]);
  const saida = path.join(raiz, 'saida.html');
  const brevo = brevoFalso();
  const fim = silenciar();
  assert.equal(await executarResumo({ brevo, agora: AGORA, raiz, env, site: SITE, args: lerArgs(['--dry-run', `--saida=${saida}`]) }), 0);
  fim();
  assert.equal(brevo.chamadas.length, 0);
  assert.ok((await readFile(saida, 'utf8')).includes('Caderno'));
});

test('data em BRT perto da meia-noite UTC', () => {
  // 02:30 UTC de 26/11 ainda é 23:30 BRT de 25/11
  assert.equal(nomeCampanha(new Date('2026-11-26T02:30:00Z')), 'Caderno HDL — resumo de 25/11/2026');
  // 03:00 UTC já é 00:00 BRT de 26/11
  assert.equal(nomeCampanha(new Date('2026-11-26T03:00:00Z')), 'Caderno HDL — resumo de 26/11/2026');
  const j = janelaDoDia(new Date('2026-11-26T02:30:00Z'));
  assert.equal(j.inicio.toISOString(), '2026-11-25T03:00:00.000Z');
  const e = montarEmailResumo({ posts: [post(1)], site: SITE, data: new Date('2026-11-26T02:30:00Z') });
  assert.ok(e.html.includes('quarta-feira, 25 de novembro de 2026'));
});
