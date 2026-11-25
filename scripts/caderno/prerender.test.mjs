import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  escapar,
  obterSiteUrl,
  montarPaginaPost,
  montarPaginaLista,
  gerarRss,
  gerarSitemap,
  prerender,
} from './prerender.mjs';

const SITE = 'https://exemplo.test';
const TEMPLATE = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="description" content="antiga" />
<title>Antigo</title>
</head><body><div id="root"></div><script type="module" src="/x.js"></script></body></html>`;

const post = (extra = {}) => ({
  versao: 1,
  slug: 'novo-modelo-20261125',
  titulo: 'Novo modelo </script><b>"quebra" & cia',
  subtitulo: 'Subtítulo da notícia',
  resumo: 'Resumo com "aspas" e <tags> & ampersand.',
  categoria: 'ia',
  tags: ['ia', 'modelos'],
  publicadoEm: '2026-11-25T13:07:00.000Z',
  atualizadoEm: '2026-11-25T14:00:00.000Z',
  tempoLeitura: 3,
  palavras: 500,
  pontosChave: ['Ponto um'],
  secoes: [{ titulo: null, paragrafos: ['Lide.'] }, { titulo: 'Detalhes', paragrafos: ['Corpo.'] }],
  porQueImporta: 'Importa muito.',
  fontes: [{ nome: 'The Verge', url: 'https://verge.test/a?x=1&y=2', titulo: 'Orig', publicadoEm: '2026-11-25T10:00:00Z', idioma: 'en' }],
  ...extra,
});

test('escapar cobre & < > " e aspas simples', () => {
  assert.equal(escapar(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapar(null), '');
});

test('obterSiteUrl respeita a ordem das variáveis e remove barra final', () => {
  assert.equal(obterSiteUrl({ SITE_URL: 'https://a.test/' }), 'https://a.test');
  assert.equal(obterSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'b.test' }), 'https://b.test');
  assert.equal(obterSiteUrl({}), 'https://hdl-solucoes-mu.vercel.app');
});

test('página do post: head, OG, JSON-LD válido e sem </script> injetado', () => {
  const html = montarPaginaPost(TEMPLATE, post(), SITE);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.match(html, /<title>Novo modelo &lt;\/script&gt;/);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/exemplo\.test\/caderno\/novo-modelo-20261125\/"/);
  assert.match(html, /property="og:type" content="article"/);
  assert.match(html, /property="og:image" content="https:\/\/exemplo\.test\/caderno\/og-caderno\.png"/);
  assert.match(html, /property="article:tag" content="modelos"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /type="application\/rss\+xml"/);
  assert.match(html, /<div id="root">[\s\S]*<h1>Novo modelo/);
  assert.match(html, /Texto produzido com IA a partir das fontes citadas/);
  assert.match(html, /<script type="module" src="\/x\.js">/);

  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocos.length, 1);
  const ld = JSON.parse(blocos[0][1]);
  assert.equal(ld['@type'], 'NewsArticle');
  assert.equal(ld.headline, post().titulo);
  assert.deepEqual(ld.isBasedOn, ['https://verge.test/a?x=1&y=2']);
  assert.equal(ld.publisher.logo.url, `${SITE}/apple-touch-icon.png`);
  // o título malicioso não pode ter criado um </script> extra
  assert.equal((html.match(/<\/script>/g) || []).length, 2);
});

test('página da lista usa og:type website e lista os posts', () => {
  const html = montarPaginaLista(TEMPLATE, [post()], SITE);
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /<title>Caderno HDL \| Notícias de tecnologia<\/title>/);
  assert.match(html, /href="\/caderno\/novo-modelo-20261125\/"/);
});

test('RSS bem-formado com campos principais e escape XML', () => {
  const xml = gerarRss([post()], SITE, new Date('2026-11-25T15:00:00Z'));
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0"[^>]*xmlns:atom/);
  assert.match(xml, /<atom:link href="https:\/\/exemplo\.test\/caderno\/feed\.xml" rel="self"/);
  assert.match(xml, /<language>pt-BR<\/language>/);
  assert.match(xml, /<guid isPermaLink="true">https:\/\/exemplo\.test\/caderno\/novo-modelo-20261125\/<\/guid>/);
  assert.match(xml, /<pubDate>Wed, 25 Nov 2026 13:07:00 GMT<\/pubDate>/);
  assert.match(xml, /<category>Inteligência Artificial<\/category>/);
  assert.ok(!xml.includes('<tags>'));
  assert.equal((xml.match(/<item>/g) || []).length, (xml.match(/<\/item>/g) || []).length);
});

test('RSS limita a 30 itens', () => {
  const muitos = Array.from({ length: 40 }, (_, i) => post({ slug: `post-${i}-20261125` }));
  assert.equal((gerarRss(muitos, SITE).match(/<item>/g) || []).length, 30);
});

test('sitemap contém home, lista e posts com lastmod', () => {
  const xml = gerarSitemap([post()], SITE, new Date('2026-11-25T15:00:00Z'));
  assert.match(xml, /<loc>https:\/\/exemplo\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/exemplo\.test\/caderno\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/exemplo\.test\/caderno\/novo-modelo-20261125\/<\/loc>\s*<lastmod>2026-11-25<\/lastmod>/);
});

async function distFalso(arquivos) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prerender-'));
  const dist = path.join(dir, 'dist');
  await fs.mkdir(dist, { recursive: true });
  await fs.writeFile(path.join(dist, 'index.html'), TEMPLATE);
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const alvo = path.join(dist, rel);
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    await fs.writeFile(alvo, conteudo);
  }
  return { dir, dist };
}

test('fluxo completo com dist falso, pulando post inválido', async () => {
  const p = post({ titulo: 'Título limpo para o fluxo completo' });
  const { dir, dist } = await distFalso({
    'caderno/index.json': JSON.stringify({ versao: 1, posts: [{ slug: p.slug }, { slug: 'quebrado-20261125' }, { slug: 'faltando-20261125' }] }),
    [`caderno/posts/${p.slug}.json`]: JSON.stringify(p),
    'caderno/posts/quebrado-20261125.json': '{ nao e json',
  });
  const logs = [];
  const r = await prerender({ distDir: dist, site: SITE, log: (m) => logs.push(m) });
  assert.equal(r.posts, 1);
  assert.ok(logs.some((m) => m.includes('quebrado-20261125')));
  const html = await fs.readFile(path.join(dist, 'caderno', p.slug, 'index.html'), 'utf8');
  assert.match(html, /Título limpo para o fluxo completo \| Caderno HDL/);
  await fs.access(path.join(dist, 'caderno', 'index.html'));
  await fs.access(path.join(dist, 'caderno', 'feed.xml'));
  assert.match(await fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8'), /novo-modelo-20261125/);
  assert.match(await fs.readFile(path.join(dist, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/exemplo\.test\/sitemap\.xml/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('índice vazio ou ausente ainda gera lista, sitemap e robots; robots existente é preservado', async () => {
  const vazio = await distFalso({ 'caderno/index.json': JSON.stringify({ versao: 1, posts: [] }) });
  const r1 = await prerender({ distDir: vazio.dist, site: SITE, log: () => {} });
  assert.equal(r1.posts, 0);
  await fs.access(path.join(vazio.dist, 'caderno', 'index.html'));
  await fs.access(path.join(vazio.dist, 'sitemap.xml'));
  await fs.rm(vazio.dir, { recursive: true, force: true });

  const ausente = await distFalso({ 'robots.txt': 'User-agent: *\nDisallow: /privado\n' });
  const r2 = await prerender({ distDir: ausente.dist, site: SITE, log: () => {} });
  assert.equal(r2.posts, 0);
  assert.match(await fs.readFile(path.join(ausente.dist, 'robots.txt'), 'utf8'), /Disallow: \/privado/);
  await fs.rm(ausente.dir, { recursive: true, force: true });
});
