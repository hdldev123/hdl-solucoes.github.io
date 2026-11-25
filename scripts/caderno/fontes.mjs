// Whitelist de fontes confiáveis do Caderno HDL.
// Só domínios listados aqui podem virar fonte de um post.
// peso: 1–3 (credibilidade/relevância editorial); primaria: blog oficial da empresa.

export const FONTES = [
  { id: 'verge', nome: 'The Verge', feed: 'https://www.theverge.com/rss/index.xml', site: 'theverge.com', idioma: 'en', peso: 2, primaria: false },
  { id: 'ars', nome: 'Ars Technica', feed: 'https://feeds.arstechnica.com/arstechnica/index', site: 'arstechnica.com', idioma: 'en', peso: 3, primaria: false },
  { id: 'techcrunch', nome: 'TechCrunch', feed: 'https://techcrunch.com/feed/', site: 'techcrunch.com', idioma: 'en', peso: 2, primaria: false },
  { id: 'wired', nome: 'Wired', feed: 'https://www.wired.com/feed/rss', site: 'wired.com', idioma: 'en', peso: 2, primaria: false },
  { id: 'mittr', nome: 'MIT Technology Review', feed: 'https://www.technologyreview.com/feed/', site: 'technologyreview.com', idioma: 'en', peso: 3, primaria: false },
  { id: 'engadget', nome: 'Engadget', feed: 'https://www.engadget.com/rss.xml', site: 'engadget.com', idioma: 'en', peso: 1, primaria: false },
  { id: 'register', nome: 'The Register', feed: 'https://www.theregister.com/headlines.atom', site: 'theregister.com', idioma: 'en', peso: 2, primaria: false },
  { id: 'ieee', nome: 'IEEE Spectrum', feed: 'https://spectrum.ieee.org/feeds/feed.rss', site: 'spectrum.ieee.org', idioma: 'en', peso: 3, primaria: false },
  { id: 'bbc', nome: 'BBC Technology', feed: 'https://feeds.bbci.co.uk/news/technology/rss.xml', site: 'bbc.co.uk', idioma: 'en', peso: 3, primaria: false },
  { id: 'guardian', nome: 'The Guardian', feed: 'https://www.theguardian.com/uk/technology/rss', site: 'theguardian.com', idioma: 'en', peso: 3, primaria: false },
  { id: 'bleeping', nome: 'BleepingComputer', feed: 'https://www.bleepingcomputer.com/feed/', site: 'bleepingcomputer.com', idioma: 'en', peso: 2, primaria: false },
  { id: 'krebs', nome: 'Krebs on Security', feed: 'https://krebsonsecurity.com/feed/', site: 'krebsonsecurity.com', idioma: 'en', peso: 3, primaria: false },
  { id: 'tecnoblog', nome: 'Tecnoblog', feed: 'https://tecnoblog.net/feed/', site: 'tecnoblog.net', idioma: 'pt', peso: 2, primaria: false },
  { id: 'canaltech', nome: 'Canaltech', feed: 'https://canaltech.com.br/rss/', site: 'canaltech.com.br', idioma: 'pt', peso: 2, primaria: false },
  { id: 'olhardigital', nome: 'Olhar Digital', feed: 'https://olhardigital.com.br/feed/', site: 'olhardigital.com.br', idioma: 'pt', peso: 1, primaria: false },
  { id: 'g1tec', nome: 'g1 Tecnologia', feed: 'https://g1.globo.com/rss/g1/tecnologia/', site: 'g1.globo.com', idioma: 'pt', peso: 2, primaria: false },
  // Blogs oficiais (fontes primárias)
  { id: 'github', nome: 'GitHub Blog', feed: 'https://github.blog/feed/', site: 'github.blog', idioma: 'en', peso: 2, primaria: true },
  { id: 'google', nome: 'Google Blog', feed: 'https://blog.google/rss/', site: 'blog.google', idioma: 'en', peso: 2, primaria: true },
  { id: 'openai', nome: 'OpenAI', feed: 'https://openai.com/news/rss.xml', site: 'openai.com', idioma: 'en', peso: 2, primaria: true },
  { id: 'microsoft', nome: 'Microsoft Blog', feed: 'https://blogs.microsoft.com/feed/', site: 'blogs.microsoft.com', idioma: 'en', peso: 2, primaria: true },
  { id: 'aws', nome: 'AWS News Blog', feed: 'https://aws.amazon.com/blogs/aws/feed/', site: 'aws.amazon.com', idioma: 'en', peso: 2, primaria: true },
  { id: 'cloudflare', nome: 'Cloudflare Blog', feed: 'https://blog.cloudflare.com/rss/', site: 'blog.cloudflare.com', idioma: 'en', peso: 2, primaria: true },
];

export function hostnamePermitido(hostname, site) {
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '');
  const s = String(site).toLowerCase().replace(/^www\./, '');
  return h === s || h.endsWith('.' + s);
}

export function fontePorUrl(url, fontes = FONTES) {
  try {
    const h = new URL(url).hostname;
    return fontes.find((f) => hostnamePermitido(h, f.site)) || null;
  } catch {
    return null;
  }
}
