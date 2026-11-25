// Moderação automática de comentários (funções puras).
//
// Camada 1 (síncrona, determinística): contemPalavrao(). Política: proibir todo
// palavrão/xingamento, inclusive disfarçado (leet, letras repetidas, separadas
// por espaço/ponto/hífen, asterisco no meio). A camada 2 (IA) fica em moderacao-ia.js.

const TEMPO_MINIMO_MS = 3000;
const MSG_GENERICA = 'Não foi possível publicar o comentário.';
export const MSG_OFENSIVO = 'Seu comentário contém linguagem ofensiva. Reescreva sem palavrões.';
export const MSG_NOME_OFENSIVO = 'Escolha outro nome.';

// ---------------------------------------------------------------------------
// Léxico (tudo já normalizado: minúsculas, sem acento, sem leet).
// ---------------------------------------------------------------------------

// Palavra inteira (aceita plural simples "s").
const PALAVRAS = [
  // abreviações e siglas
  'pqp', 'fdp', 'vsf', 'tnc', 'vtnc', 'tmnc', 'krl', 'crl', 'crlh', 'kct', 'pnc',
  'vtc', 'sfd', 'kralho', 'karalho', 'carai', 'caraio', 'cu', 'ku', 'wtf', 'stfu',
  // vulgares
  'cagar', 'cagada', 'cagado', 'cagou', 'cagando', 'cagao', 'bronha', 'biscate',
  'quenga', 'prostituta',
  // xingamentos e ofensas
  'corno', 'corna', 'cornudo', 'cornao', 'vadia', 'vadio', 'piranha', 'safado',
  'safada', 'canalha', 'verme', 'estupido', 'estupida', 'crioulo', 'crioula',
  'nazista', 'sapatao', 'bichona', 'maricas', 'marica',
  // inglês
  'dick', 'dicks', 'cunt', 'pussy', 'fuk', 'fck', 'fucker', 'retard', 'nigger',
  'nigga',
];

// Só valem quando formadas pela junção de letras separadas ("f u").
const SO_JUNCAO = ['fu'];

// Prefixo no INÍCIO da palavra (cobre flexões e diminutivos).
const RAIZES = [
  'porr', 'caralh', 'cacet', 'fod', 'fud', 'merd', 'bost', 'puta', 'puto', 'putinh',
  'bucet', 'xoxot', 'xerec', 'piroc', 'pirok', 'arrombad', 'babac', 'otari',
  'imbecil', 'idiot', 'cretin', 'mongoloid', 'escrot', 'vagabund', 'viad',
  'travec', 'boiol', 'baitol', 'desgracad', 'filhodaput', 'filhadaput', 'cuzao',
  'cuzinh', 'cuzud', 'cuzona', 'punhet', 'siriric', 'vaitomar', 'vasefod',
  // inglês
  'fuck', 'motherfuck', 'shit', 'bullshit', 'bitch', 'asshole', 'bastard',
  'dickhead', 'slut', 'whore',
];

// Palavras legítimas que começam com uma raiz (testadas na palavra original).
// "porrete" (cassetete) e "putativo" etc. passam; "porre"/"porrada" continuam bloqueadas.
const EXCECOES = [
  'bostez', 'boston', 'boost', 'food', 'putativ', 'putamen', 'cacetete', 'viadut',
  'babacu', 'otariid', 'cretinism', 'escrotal', 'shitak', 'shiitak', 'shitac', 'shiitac', 'piroclas',
  'pirocin', 'porrete', 'fudg', 'fodder',
];

// Expressões multi-palavra (texto normalizado, espaços colapsados).
const EXPRESSOES = [
  'vai tomar no', 'va tomar no', 'tomar no cu', 'toma no cu', 'pau no cu',
  'vai se f', 'va se f', 'vai se foder', 'puta que pariu', 'puta que o pariu',
  'filho da puta', 'filha da puta', 'vai a merda', 'vai pra merda',
  // "macaco"/"retardado" sozinhos são legítimos (animal / "lançamento retardado")
  'seu macaco', 'sua macaca', 'retardado mental', 'retardados mentais',
  'seu retardado', 'sua retardada', 'um retardado', 'uma retardada',
  'voce e retardado', 'vc e retardado',
];

const LEET = { 4: 'a', 3: 'e', 0: 'o', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };
const INVISIVEIS = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;
const HOMOGLIFOS = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ѕ: 's', ј: 'j',
  ο: 'o', ν: 'v', ι: 'i', ı: 'i',
};

// minúsculas, sem acento/invisíveis/homóglifos e leet destravado.
// um = letra usada para "1" ("i" por padrão; "l" na variante alternativa);
// k = troca "k" por "c" (kralho -> cralho).
export function normalizar(texto, { um = 'i', k = false } = {}) {
  let t = String(texto)
    .replace(INVISIVEIS, '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x00-\x7f]/g, (c) => HOMOGLIFOS[c] ?? c)
    .replace(/(?<=[a-z])!(?=[a-z])/g, 'i')
    .replace(/[43105787@$]/g, (c) => (c === '1' ? um : LEET[c]));
  if (k) t = t.replace(/k/g, 'c');
  return t;
}

const alt = (lista) => lista.join('|');
const RAIZ_RE = new RegExp(`^(?:${alt(RAIZES)})`);
const EXC_RE = new RegExp(`^(?:${alt(EXCECOES)})`);
const PAL = new Set(PALAVRAS);
const JUNCAO = new Set(SO_JUNCAO);
const EXPR_RE = new RegExp(`(?:^| )(?:${alt(EXPRESSOES)})(?: |$)`);

const SEG = /[a-z]+(?:\*+[a-z]+)*/g;

// Variantes contra letras repetidas ("porraaaa", "puuuta", "carralho").
function variantes(p) {
  const v1 = p.replace(/(.)\1{2,}/g, '$1$1');
  const v4 = p.replace(/(.)\1{2,}/g, '$1');
  return new Set([
    p, v1, v1.replace(/([aeiou])\1+/g, '$1'), v4, v4.replace(/([aeiou])\1+/g, '$1'),
    p.replace(/(.)\1+/g, '$1'),
    // colapsa duplicações exceto "rr"/"ss" legítimos ("pporra" -> "porra")
    p.replace(/([^rs])\1+/g, '$1').replace(/([rs])\1{2,}/g, '$1$1'),
  ]);
}

function ehPalavra(v) {
  return PAL.has(v) || (v.length > 3 && v.endsWith('s') && PAL.has(v.slice(0, -1)));
}

// modo: 'solto' (token inteiro), 'parte' (pedaço de token com separador interno),
// 'juncao' (letras separadas coladas).
function testarPalavra(p, modo) {
  if (p.length > 60) return null;
  if (p.includes('*')) {
    // cada "*" interno é um curinga de 1 letra
    if ((p.match(/\*/g) || []).length <= 2) {
      for (const c of 'abcdefghijklmnopqrstuvwxyz') {
        const r = testarPalavra(p.replace('*', c), modo);
        if (r) return r;
      }
    }
    // asteriscos como separadores ("p*o*r*r*a")
    return testarPalavra(p.replace(/\*/g, ''), modo === 'solto' ? 'juncao' : modo);
  }
  const excecao = EXC_RE.test(p);
  for (const v of variantes(p)) {
    if (!(modo === 'parte' && p.length <= 2) && ehPalavra(v)) return v;
    if (modo === 'juncao' && JUNCAO.has(v)) return v;
    if (!excecao && RAIZ_RE.test(v)) return v;
  }
  return null;
}

function analisar(norm) {
  const segs = [];
  for (const tok of norm.split(/\s+/)) {
    const partes = tok.match(SEG) || [];
    const multi = partes.length > 1;
    for (const s of partes) {
      segs.push(s);
      const r = testarPalavra(s, multi ? 'parte' : 'solto');
      if (r) return r;
    }
    if (multi) {
      const r = testarPalavra(partes.join(''), 'juncao'); // "p.o.r.r.a", "pu-ta"
      if (r) return r;
    }
  }
  // Letras separadas: janelas de 2+ segmentos curtos consecutivos ("p o r r a").
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].length > 2) continue;
    let junto = segs[i];
    for (let j = i + 1; j < segs.length && j - i < 14 && segs[j].length <= 2; j++) {
      junto += segs[j];
      const r = testarPalavra(junto, 'juncao');
      if (r) return r;
    }
  }
  for (const v of variantes(segs.join(' '))) {
    const m = EXPR_RE.exec(v);
    if (m) return m[0].trim();
  }
  return null;
}

function formas(texto) {
  const out = new Set();
  for (const um of texto.includes('1') ? ['i', 'l'] : ['i']) {
    for (const k of [false, true]) out.add(normalizar(texto, { um, k }));
  }
  return out;
}

/**
 * Versão "desembrulhada" do texto: tira números grudados nas pontas das palavras
 * ("fdp123", "2024porra") e a decoração de apelido com x nas pontas ("xXputaXx"),
 * que de outro modo viram letras pelo leet e escondem abreviações.
 */
function desembrulhar(texto) {
  return texto
    .replace(/(\p{L}{2,})\d+(?=$|[^\p{L}\d])/gu, '$1')
    .replace(/(^|[^\p{L}\d])\d+(\p{L}{2,})/gu, '$1$2')
    .replace(/(^|[^\p{L}\d])[xX]{1,3}(\p{L}{3,}?)[xX]{1,3}(?=$|[^\p{L}\d])/gu, '$1$2');
}

/** Camada 1: { bloqueado, termo? } (termo só para log/teste; não expor ao usuário). */
export function contemPalavrao(texto) {
  if (typeof texto !== 'string' || !texto) return { bloqueado: false };
  const base = texto.slice(0, 5000);
  const alvos = new Set(formas(base));
  const solto = desembrulhar(base);
  if (solto !== base) for (const f of formas(solto)) alvos.add(f);
  for (const norm of alvos) {
    const termo = analisar(norm);
    if (termo) return { bloqueado: true, termo };
  }
  return { bloqueado: false };
}

export function temOfensa(texto) {
  return contemPalavrao(texto).bloqueado;
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
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '');
}

function limparTexto(valor) {
  let t = limparBase(valor)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
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

  // Normaliza ANTES de checar (limpa invisíveis/quebras), mas guarda o original limpo.
  const n = limparNome(nome);
  const t = limparTexto(texto);

  if (n.length < 2 || n.length > 40) return { ok: false, erro: 'O nome deve ter entre 2 e 40 caracteres.' };
  if (t.length < 3 || t.length > 1000) return { ok: false, erro: 'O comentário deve ter entre 3 e 1000 caracteres.' };

  for (const [campo, msg] of [[n, MSG_NOME_OFENSIVO], [t, MSG_OFENSIVO]]) {
    if (temLink(campo)) return { ok: false, erro: 'Links, endereços de sites e e-mails não são permitidos.' };
    if (contemPalavrao(campo).bloqueado) return { ok: false, erro: msg };
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
