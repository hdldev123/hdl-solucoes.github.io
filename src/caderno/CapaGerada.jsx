import { useId } from 'react';
import {
  Brain, Cloud, Cpu, Code2, Rocket, Shield, Smartphone, Telescope, Newspaper,
} from 'lucide-react';

export const ICONES_CATEGORIA = {
  ia: Brain,
  seguranca: Shield,
  desenvolvimento: Code2,
  nuvem: Cloud,
  hardware: Cpu,
  mobile: Smartphone,
  negocios: Rocket,
  ciencia: Telescope,
};

/* Matiz base por categoria (HSL). Sobre o marinho da marca, com saturação contida
   para manter contraste com o âmbar e com o ícone claro. */
const MATIZES = {
  ia: 268,
  seguranca: 350,
  desenvolvimento: 168,
  nuvem: 204,
  hardware: 22,
  mobile: 318,
  negocios: 142,
  ciencia: 242,
};

const L = 800;
const A = 450;
const CELULA = 50;

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32). */
function semente(n) {
  let s = n;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const faixa = (r, min, max) => min + r() * (max - min);

function gerar(categoria, slug) {
  const h = MATIZES[categoria] ?? 215;
  const r = semente(hash(`${categoria}:${slug}`));

  const blobs = [0, 1, 2].map((i) => ({
    cx: faixa(r, 0.1, 0.9) * L,
    cy: faixa(r, 0.05, 0.95) * A,
    raio: faixa(r, 190, 340),
    matiz: (h + [0, 32, -26][i] + 360) % 360,
    opac: faixa(r, 0.5, 0.85),
  }));

  // ondas: duas curvas suaves atravessando a arte
  const ondas = [0, 1].map((i) => {
    const y = faixa(r, 0.45, 0.95) * A;
    const a1 = faixa(r, 40, 110) * (r() > 0.5 ? 1 : -1);
    const a2 = faixa(r, 40, 110) * (r() > 0.5 ? 1 : -1);
    return {
      d: `M -20 ${y.toFixed(1)} C ${(L * 0.3).toFixed(0)} ${(y + a1).toFixed(1)}, ${(L * 0.65).toFixed(0)} ${(y + a2).toFixed(1)}, ${L + 20} ${(y - a1 / 2).toFixed(1)}`,
      largura: i === 0 ? 1.6 : 1,
      opac: i === 0 ? 0.32 : 0.18,
    };
  });

  // arco grande parcial
  const arco = {
    cx: r() > 0.5 ? faixa(r, 0.7, 1) * L : faixa(r, 0, 0.3) * L,
    cy: faixa(r, 0.2, 0.8) * A,
    raio: faixa(r, 150, 230),
  };

  // "pixel duplo": quadrados em grade, posições pela semente
  const colunas = L / CELULA;
  const linhas = A / CELULA;
  const usadas = new Set();
  const pixels = [];
  const total = 4 + Math.floor(r() * 3);
  for (let i = 0; i < total * 3 && pixels.length < total; i += 1) {
    const c = 1 + Math.floor(r() * (colunas - 2));
    const l = 1 + Math.floor(r() * (linhas - 2));
    const chave = `${c}:${l}`;
    if (!usadas.has(chave)) {
      usadas.add(chave);
      pixels.push({ x: c * CELULA, y: l * CELULA, ambar: r() > 0.4, duplo: r() > 0.35 });
    }
  }

  // ícone grande: lado oposto ao bloco de texto (canto inferior esquerdo)
  const icone = { x: faixa(r, 0.52, 0.66) * L, y: faixa(r, 0.08, 0.2) * A, tam: faixa(r, 230, 270) };

  return {
    h, blobs, ondas, arco, pixels, icone, angulo: Math.floor(r() * 4) * 30 + 100,
  };
}

/**
 * Capa ilustrada gerada: SVG determinístico a partir de slug + categoria.
 * variante 'card' (lista/relacionadas) ou 'hero' (topo do artigo, 16:9 + legenda).
 */
export default function CapaGerada({
  categoria, slug = '', palavra = '', variante = 'card', cheia = false,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const Icone = ICONES_CATEGORIA[categoria] || Newspaper;
  const g = gerar(categoria, slug || categoria || 'caderno');
  const rad = (g.angulo * Math.PI) / 180;
  const x2 = 0.5 + Math.cos(rad) * 0.5;
  const y2 = 0.5 + Math.sin(rad) * 0.5;
  const palavraCurta = String(palavra || '').trim().slice(0, 16).toUpperCase();
  const id = (n) => `${n}-${uid}`;

  const arte = (
    <svg
      className={`capa-gerada capa-gerada-${variante}${cheia ? ' capa-gerada-cheia' : ''}`}
      viewBox={`0 0 ${L} ${A}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id('bg')} x1={1 - x2} y1={1 - y2} x2={x2} y2={y2}>
          <stop offset="0" stopColor="#0C121C" />
          <stop offset="0.55" stopColor="#111926" />
          <stop offset="1" stopColor={`hsl(${g.h} 52% 26%)`} />
        </linearGradient>
        {g.blobs.map((b, i) => (
          <radialGradient key={i} id={id(`b${i}`)} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={`hsl(${b.matiz} 70% ${i === 0 ? 46 : 40}%)`} stopOpacity={b.opac} />
            <stop offset="1" stopColor={`hsl(${b.matiz} 70% 40%)`} stopOpacity="0" />
          </radialGradient>
        ))}
        <pattern id={id('pt')} width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#fff" />
        </pattern>
        <linearGradient id={id('vinheta')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#0C121C" stopOpacity="0" />
          <stop offset="1" stopColor="#0C121C" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect width={L} height={A} fill={`url(#${id('bg')})`} />
      {g.blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.raio} fill={`url(#${id(`b${i}`)})`} />
      ))}
      <rect width={L} height={A} fill={`url(#${id('pt')})`} opacity="0.1" />

      <circle cx={g.arco.cx} cy={g.arco.cy} r={g.arco.raio} fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1.5" />
      <circle cx={g.arco.cx} cy={g.arco.cy} r={g.arco.raio * 0.72} fill="none" stroke={`hsl(${g.h} 80% 72%)`} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 7" />
      {g.ondas.map((o, i) => (
        <path key={i} d={o.d} fill="none" stroke={`hsl(${g.h} 85% 78%)`} strokeOpacity={o.opac} strokeWidth={o.largura} />
      ))}

      <Icone x={g.icone.x} y={g.icone.y} width={g.icone.tam} height={g.icone.tam} color="#fff" strokeWidth={0.9} opacity="0.16" />

      {palavraCurta ? (
        <text x="44" y={A - 46} fill="#fff" fillOpacity="0.14" fontFamily="Sora, 'Segoe UI', sans-serif" fontWeight="700" fontSize="58" letterSpacing="-1.5">
          {palavraCurta}
        </text>
      ) : null}

      <rect width={L} height={A} fill={`url(#${id('vinheta')})`} />

      {g.pixels.map((p, i) => (
        <g key={i}>
          {p.duplo ? <rect x={p.x - 9} y={p.y - 9} width="16" height="16" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" /> : null}
          <rect x={p.x} y={p.y} width="16" height="16" fill={p.ambar ? '#F9BC20' : '#fff'} fillOpacity={p.ambar ? 0.95 : 0.8} />
        </g>
      ))}
    </svg>
  );

  if (variante === 'hero') {
    return (
      <figure className="capa-hero">
        {arte}
        <figcaption>Ilustração: Caderno HDL</figcaption>
      </figure>
    );
  }
  return arte;
}
