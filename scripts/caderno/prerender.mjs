// Pré-renderização do Caderno HDL (roda depois do `vite build`).
// Gera HTML estático por notícia (prévia rica + SEO), RSS, sitemap e robots.
// Sem dependências externas.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SITE_PADRAO = 'https://hdl-solucoes-mu.vercel.app';
export const LIMITE_LISTA = 30;
export const CATEGORIAS = {
  ia: 'Inteligência Artificial',
  seguranca: 'Segurança',
  desenvolvimento: 'Desenvolvimento',
  nuvem: 'Nuvem & Infra',
  hardware: 'Hardware',
  mobile: 'Mobile',
  negocios: 'Negócios & Startups',
  ciencia: 'Ciência & Espaço',
};

const NOME_SITE = 'HDL Soluções';
const TITULO_LISTA = 'Caderno HDL | Notícias de tecnologia';
const DESC_LISTA =
  'Caderno HDL: notícias de tecnologia explicadas em português, com fontes citadas e foco no que importa para empresas, devs e usuários no Brasil.';
const AVISO_IA = 'Texto produzido com IA a partir das fontes citadas.';
const OG_ALT = 'Caderno HDL - Notícias de tecnologia que importam';

// ---------- utilitários puros ----------

export function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function obterSiteUrl(env = process.env) {
  let site = env.SITE_URL;
  if (!site && env.VERCEL_PROJECT_PRODUCTION_URL) {
    site = `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return String(site || SITE_PADRAO).trim().replace(/\/+$/, '');
}

export function rotuloCategoria(id) {
  return CATEGORIAS[id] || id || 'Tecnologia';
}

// JSON seguro para dentro de <script>: nunca fecha a tag nem abre comentário.
export function jsonSeguro(obj) {
  return JSON.stringify(obj).replace(/<\//g, '<\\/').replace(/<!--/g, '\\u003c!--');
}

function dataValida(valor) {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function iso(valor) {
  const d = dataValida(valor);
  return d ? d.toISOString() : undefined;
}

function dataExtenso(valor) {
  const d = dataValida(valor);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

const urlPost = (site, slug) => `${site}/caderno/${slug}/`;
const urlImagem = (site) => `${site}/caderno/og-caderno.png`;

function xmlEscapar(valor) {
  return escapar(valor).replace(/&#39;/g, '&apos;');
}

// ---------- head ----------

function meta(attr, nome, conteudo) {
  return `<meta ${attr}="${escapar(nome)}" content="${escapar(conteudo)}" />`;
}

function removerTagsExistentes(html) {
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi, '')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, '')
    .replace(/<meta\b(?=[^>]*\b(?:property|name)\s*=\s*["'](?:og|article|twitter):)[^>]*>/gi, '');
}

const LINK_RSS = '<link rel="alternate" type="application/rss+xml" title="Caderno HDL" href="/caderno/feed.xml" />';

function blocoOgComum({ site, titulo, descricao, url, tipo }) {
  return [
    meta('property', 'og:type', tipo),
    meta('property', 'og:site_name', NOME_SITE),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:title', titulo),
    meta('property', 'og:description', descricao),
    meta('property', 'og:url', url),
    meta('property', 'og:image', urlImagem(site)),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', OG_ALT),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', titulo),
    meta('name', 'twitter:description', descricao),
    meta('name', 'twitter:image', urlImagem(site)),
  ];
}

export function montarJsonLd(post, site) {
  const url = urlPost(site, post.slug);
  const fontes = Array.isArray(post.fontes) ? post.fontes.filter((f) => f && f.url) : [];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.titulo,
    description: post.resumo,
    datePublished: iso(post.publicadoEm),
    dateModified: iso(post.atualizadoEm || post.publicadoEm),
    inLanguage: 'pt-BR',
    articleSection: rotuloCategoria(post.categoria),
    keywords: (post.tags || []).join(', '),
    wordCount: post.palavras,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: [urlImagem(site)],
    publisher: {
      '@type': 'Organization',
      name: NOME_SITE,
      logo: { '@type': 'ImageObject', url: `${site}/apple-touch-icon.png` },
    },
    author: { '@type': 'Organization', name: 'Caderno HDL', url: `${site}/caderno/` },
    isBasedOn: fontes.map((f) => f.url),
  };
  return ld;
}

export function montarHeadPost(post, site) {
  const titulo = `${post.titulo} | Caderno HDL`;
  const url = urlPost(site, post.slug);
  const publicado = iso(post.publicadoEm);
  const modificado = iso(post.atualizadoEm || post.publicadoEm);
  const linhas = [
    `<title>${escapar(titulo)}</title>`,
    meta('name', 'description', post.resumo),
    `<link rel="canonical" href="${escapar(url)}" />`,
    LINK_RSS,
    ...blocoOgComum({ site, titulo: post.titulo, descricao: post.resumo, url, tipo: 'article' }),
  ];
  if (publicado) linhas.push(meta('property', 'article:published_time', publicado));
  if (modificado) linhas.push(meta('property', 'article:modified_time', modificado));
  linhas.push(meta('property', 'article:section', rotuloCategoria(post.categoria)));
  for (const tag of post.tags || []) linhas.push(meta('property', 'article:tag', tag));
  linhas.push(`<script type="application/ld+json">${jsonSeguro(montarJsonLd(post, site))}</script>`);
  return linhas.join('\n    ');
}

export function montarHeadLista(site) {
  const url = `${site}/caderno/`;
  return [
    `<title>${escapar(TITULO_LISTA)}</title>`,
    meta('name', 'description', DESC_LISTA),
    `<link rel="canonical" href="${escapar(url)}" />`,
    LINK_RSS,
    ...blocoOgComum({ site, titulo: TITULO_LISTA, descricao: DESC_LISTA, url, tipo: 'website' }),
  ].join('\n    ');
}

// ---------- corpo estático ----------

export function montarCorpoPost(post) {
  const partes = [];
  partes.push('<article>');
  partes.push(`<p>${escapar(rotuloCategoria(post.categoria))}</p>`);
  partes.push(`<h1>${escapar(post.titulo)}</h1>`);
  if (post.subtitulo) partes.push(`<p>${escapar(post.subtitulo)}</p>`);
  const pub = iso(post.publicadoEm);
  if (pub) partes.push(`<p><time datetime="${escapar(pub)}">${escapar(dataExtenso(post.publicadoEm))}</time></p>`);
  if (post.pontosChave?.length) {
    partes.push('<h2>Pontos-chave</h2>');
    partes.push(`<ul>${post.pontosChave.map((p) => `<li>${escapar(p)}</li>`).join('')}</ul>`);
  }
  for (const secao of post.secoes || []) {
    if (secao?.titulo) partes.push(`<h2>${escapar(secao.titulo)}</h2>`);
    for (const par of secao?.paragrafos || []) partes.push(`<p>${escapar(par)}</p>`);
  }
  if (post.porQueImporta) {
    partes.push('<h2>Por que importa</h2>');
    partes.push(`<p>${escapar(post.porQueImporta)}</p>`);
  }
  const fontes = (post.fontes || []).filter((f) => f && f.url);
  if (fontes.length) {
    partes.push('<h2>Fontes</h2>');
    partes.push(
      `<ul>${fontes
        .map((f) => `<li><a href="${escapar(f.url)}" rel="noopener noreferrer nofollow">${escapar(f.nome || f.url)}</a>${f.titulo ? ` - ${escapar(f.titulo)}` : ''}</li>`)
        .join('')}</ul>`,
    );
  }
  partes.push(`<p><small>${escapar(AVISO_IA)}</small></p>`);
  partes.push('<p><a href="/caderno/">Voltar ao Caderno HDL</a></p>');
  partes.push('</article>');
  return partes.join('\n      ');
}

export function montarCorpoLista(posts) {
  const itens = posts.slice(0, LIMITE_LISTA);
  const partes = ['<main>', '<h1>Caderno HDL</h1>', '<p>Notícias de tecnologia que importam, explicadas em português.</p>'];
  if (!itens.length) partes.push('<p>Em breve, as primeiras notícias.</p>');
  for (const p of itens) {
    partes.push('<article>');
    partes.push(`<h2><a href="/caderno/${escapar(p.slug)}/">${escapar(p.titulo)}</a></h2>`);
    partes.push(`<p>${escapar(p.resumo)}</p>`);
    partes.push('</article>');
  }
  partes.push('</main>');
  return partes.join('\n      ');
}

// ---------- template ----------

export function aplicarTemplate(template, head, corpo) {
  let html = removerTagsExistentes(template);
  // replace por função: evita interpretar "$&" etc. no conteúdo
  if (/<\/head\s*>/i.test(html)) html = html.replace(/<\/head\s*>/i, () => `    ${head}\n  </head>`);
  else html = `${head}\n${html}`;
  const root = /<div\b[^>]*\bid\s*=\s*["']root["'][^>]*>[\s\S]*?<\/div\s*>/i;
  if (root.test(html)) html = html.replace(root, () => `<div id="root">\n      ${corpo}\n    </div>`);
  return html;
}

export function montarPaginaPost(template, post, site) {
  return aplicarTemplate(template, montarHeadPost(post, site), montarCorpoPost(post));
}

export function montarPaginaLista(template, posts, site) {
  return aplicarTemplate(template, montarHeadLista(site), montarCorpoLista(posts));
}

// ---------- RSS / sitemap / robots ----------

export function gerarRss(posts, site, agora = new Date()) {
  const itens = posts.slice(0, LIMITE_LISTA);
  const ultima = itens.map((p) => dataValida(p.publicadoEm)).find(Boolean) || agora;
  const xmlItens = itens
    .map((p) => {
      const url = urlPost(site, p.slug);
      const data = dataValida(p.publicadoEm);
      return [
        '    <item>',
        `      <title>${xmlEscapar(p.titulo)}</title>`,
        `      <link>${xmlEscapar(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscapar(url)}</guid>`,
        data ? `      <pubDate>${data.toUTCString()}</pubDate>` : null,
        `      <description>${xmlEscapar(p.resumo)}</description>`,
        `      <category>${xmlEscapar(rotuloCategoria(p.categoria))}</category>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Caderno HDL</title>
    <link>${xmlEscapar(`${site}/caderno/`)}</link>
    <description>${xmlEscapar(DESC_LISTA)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${ultima.toUTCString()}</lastBuildDate>
    <atom:link href="${xmlEscapar(`${site}/caderno/feed.xml`)}" rel="self" type="application/rss+xml" />
${xmlItens}
  </channel>
</rss>
`;
}

export function gerarSitemap(posts, site, agora = new Date()) {
  const hoje = agora.toISOString().slice(0, 10);
  const urls = [
    { loc: `${site}/`, lastmod: hoje },
    { loc: `${site}/caderno/`, lastmod: iso(posts[0]?.atualizadoEm || posts[0]?.publicadoEm)?.slice(0, 10) || hoje },
    ...posts.map((p) => ({ loc: urlPost(site, p.slug), lastmod: iso(p.atualizadoEm || p.publicadoEm)?.slice(0, 10) })),
  ];
  const corpo = urls
    .map((u) => `  <url>\n    <loc>${xmlEscapar(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${corpo}
</urlset>
`;
}

export function gerarRobots(site) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
}

// ---------- fluxo principal ----------

async function lerJson(arquivo) {
  return JSON.parse(await fs.readFile(arquivo, 'utf8'));
}

const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function prerender({ distDir, site, agora = new Date(), log = console.log } = {}) {
  const dist = path.resolve(distDir);
  const base = site || obterSiteUrl();
  const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  const cadernoDir = path.join(dist, 'caderno');
  await fs.mkdir(cadernoDir, { recursive: true });

  let indice = [];
  try {
    const dados = await lerJson(path.join(cadernoDir, 'index.json'));
    indice = Array.isArray(dados.posts) ? dados.posts : [];
  } catch (erro) {
    log(`[prerender] sem índice do Caderno (${erro.code || erro.message}); gerando só a lista vazia.`);
  }

  const posts = [];
  for (const entrada of indice) {
    const slug = entrada?.slug;
    if (typeof slug !== 'string' || !SLUG_OK.test(slug)) {
      log(`[prerender] aviso: slug inválido ignorado (${JSON.stringify(slug)}).`);
      continue;
    }
    try {
      const post = await lerJson(path.join(cadernoDir, 'posts', `${slug}.json`));
      if (post.slug !== slug || !post.titulo || !post.resumo) throw new Error('campos obrigatórios ausentes');
      posts.push(post);
    } catch (erro) {
      log(`[prerender] aviso: post "${slug}" ignorado (${erro.message}).`);
    }
  }
  posts.sort((a, b) => (dataValida(b.publicadoEm)?.getTime() || 0) - (dataValida(a.publicadoEm)?.getTime() || 0));

  for (const post of posts) {
    const pasta = path.join(cadernoDir, post.slug);
    await fs.mkdir(pasta, { recursive: true });
    await fs.writeFile(path.join(pasta, 'index.html'), montarPaginaPost(template, post, base));
  }
  await fs.writeFile(path.join(cadernoDir, 'index.html'), montarPaginaLista(template, posts, base));
  await fs.writeFile(path.join(cadernoDir, 'feed.xml'), gerarRss(posts, base, agora));
  await fs.writeFile(path.join(dist, 'sitemap.xml'), gerarSitemap(posts, base, agora));

  let robotsCriado = false;
  try {
    await fs.access(path.join(dist, 'robots.txt'));
  } catch {
    await fs.writeFile(path.join(dist, 'robots.txt'), gerarRobots(base));
    robotsCriado = true;
  }

  log(`[prerender] ${posts.length} notícia(s) + lista, feed.xml e sitemap.xml${robotsCriado ? ' + robots.txt' : ''} gerados (${base}).`);
  return { posts: posts.length, site: base, robotsCriado };
}

const executadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executadoDiretamente) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  prerender({ distDir: path.join(raiz, 'dist') }).catch((erro) => {
    console.error('[prerender] falha:', erro);
    process.exit(1);
  });
}
