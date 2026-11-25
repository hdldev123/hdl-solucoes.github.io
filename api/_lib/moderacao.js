// Moderação automática de comentários (função pura).

const TEMPO_MINIMO_MS = 3000;
const MSG_GENERICA = 'Não foi possível publicar o comentário.';

// Termos claramente ofensivos/discriminatórios (já sem acento). Comparação por
// palavra inteira, também aceitando plural simples ("s" final).
const TERMOS = [
  'porra', 'caralho', 'puta', 'puto', 'putaria', 'merda', 'bosta', 'buceta',
  'cuzao', 'cu', 'foda', 'fodase', 'foder', 'fdp', 'pqp', 'vsf', 'punheta',
  'cacete', 'arrombado', 'arrombada', 'viado', 'viadinho', 'vagabundo',
  'vagabunda', 'otario', 'otaria', 'babaca', 'idiota', 'imbecil', 'retardado',
  'retardada', 'mongoloide', 'cretino', 'cretina', 'estupido', 'estupida',
  'desgracado', 'desgracada', 'piranha', 'vadia', 'crioulo', 'sapatao',
  'traveco', 'nazista', 'verme', 'escroto', 'escrota', 'canalha', 'safado',
  'safada', 'corno', 'cuzinho', 'xereca', 'prostituta',
];

const LEET = { 4: 'a', 3: 'e', 1: 'i', 0: 'o', 5: 's', '@': 'a', $: 's' };

// minúsculas, sem acento, leet destravado e letras repetidas colapsadas.
export function normalizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[43105@$]/g, (c) => LEET[c])
    .replace(/([a-z])\1+/g, '$1');
}

const CONJUNTO = new Set(TERMOS.map(normalizar));

export function temOfensa(texto) {
  const palavras = normalizar(texto).split(/[^a-z]+/).filter(Boolean);
  return palavras.some((p) => CONJUNTO.has(p) || (p.endsWith('s') && CONJUNTO.has(p.slice(0, -1))));
}

const TLDS = 'com|net|org|edu|gov|br|io|co|me|info|biz|xyz|app|dev|ly|tv|ai|us|pt|online|site|shop|link|club|top|store|blog|cc|ru|cn';
const RE_LINK = new RegExp(
  `https?:|ftp:|www\\.|\\bponto\\s?(?:com|br)\\b|[a-z0-9-]+\\.(?:${TLDS})\\b|@[a-z0-9]`,
  'i',
);

export function temLink(texto) {
  return RE_LINK.test(texto);
}

function limparBase(valor) {
  return String(valor ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
}

function limparTexto(valor) {
  let t = limparBase(valor)
    .split('\n')
    .map((l) => l.replace(/[ \t\u00A0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  let quebras = 0;
  t = t.replace(/\n/g, () => (++quebras > 6 ? ' ' : '\n'));
  return t;
}

function limparNome(valor) {
  return limparBase(valor).replace(/\s+/g, ' ').trim();
}

export function moderarComentario({ nome, texto, site, tempo } = {}) {
  if (typeof site === 'string' ? site.trim() !== '' : Boolean(site)) {
    return { ok: false, erro: MSG_GENERICA };
  }
  const ms = Number(tempo);
  if (!Number.isFinite(ms) || ms < TEMPO_MINIMO_MS) {
    return { ok: false, erro: 'Calma! Leia a notícia antes de comentar.' };
  }
  if (typeof nome !== 'string' || typeof texto !== 'string') {
    return { ok: false, erro: 'Preencha seu nome e o comentário.' };
  }

  const n = limparNome(nome);
  const t = limparTexto(texto);

  if (n.length < 2 || n.length > 40) return { ok: false, erro: 'O nome deve ter entre 2 e 40 caracteres.' };
  if (t.length < 3 || t.length > 1000) return { ok: false, erro: 'O comentário deve ter entre 3 e 1000 caracteres.' };

  for (const campo of [n, t]) {
    if (temLink(campo)) return { ok: false, erro: 'Links, endereços de sites e e-mails não são permitidos.' };
    if (temOfensa(campo)) return { ok: false, erro: 'Seu comentário contém linguagem imprópria. Reescreva com respeito.' };
  }

  if (/(.)\1{8,}/su.test(t) || /(.)\1{8,}/su.test(n)) {
    return { ok: false, erro: 'Evite repetir o mesmo caractere várias vezes.' };
  }
  const letras = t.match(/\p{L}/gu) || [];
  if (letras.length > 20) {
    const maius = letras.filter((c) => c !== c.toLowerCase()).length;
    if (maius / letras.length > 0.7) return { ok: false, erro: 'Evite escrever tudo em maiúsculas.' };
  }

  return { ok: true, nome: n, texto: t };
}
