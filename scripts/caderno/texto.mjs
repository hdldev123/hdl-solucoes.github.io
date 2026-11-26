// Reparo de mojibake (UTF-8 lido como Latin-1/cp1252), comum em respostas de modelos.
const RE_LATIN1 = /[\u00C2-\u00F4][\u0080-\u00BF]+/g;
const RE_CP1252 = /\u00E2\u20AC([\s\S])/g;

// Caracteres que o cp1252 usa nas posições 0x80-0x9F -> byte original.
const CP1252 = new Map(
  Object.entries({
    '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
    '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8a, '\u2039': 0x8b, '\u0152': 0x8c, '\u017D': 0x8e,
    '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203A': 0x9b, '\u0153': 0x9c, '\u017E': 0x9e, '\u0178': 0x9f,
  }),
);

function decodificar(bytes) {
  const s = Buffer.from(bytes).toString('utf8');
  return s.includes('\uFFFD') ? null : s;
}

export function repararMojibake(s) {
  if (typeof s !== 'string') return s;
  // aspas/travessões tipográficos: "â€" + 1 caractere (cp1252, controle C1 ou Latin-1)
  let out = s.replace(RE_CP1252, (m, c) => {
    const cod = c.charCodeAt(0);
    const b = CP1252.has(c) ? CP1252.get(c) : cod >= 0x80 && cod <= 0xff ? cod : null;
    if (b === null) return m;
    return decodificar([0xe2, 0x80, b]) ?? m;
  });
  out = out.replace(RE_LATIN1, (trecho) => {
    const r = decodificar(Buffer.from(trecho, 'latin1'));
    return r !== null && r !== trecho ? r : trecho;
  });
  return out;
}

/** Aplica repararMojibake a todas as strings de um valor JSON (objetos e listas). */
export function repararMojibakeProfundo(v) {
  if (typeof v === 'string') return repararMojibake(v);
  if (Array.isArray(v)) return v.map(repararMojibakeProfundo);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, repararMojibakeProfundo(x)]));
  return v;
}
