import {
  Brain, Cloud, Cpu, Clock, Code2, Heart, MessageCircle, Rocket, Shield, Smartphone, Telescope, Newspaper,
} from 'lucide-react';
import { dataRelativa, rotuloCategoria, urlDoPost } from './dados.js';

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

function hash(texto) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

/** Capa gerada: gradiente/padrão determinístico por categoria + ícone. Sem imagens externas. */
export function CapaCategoria({ categoria, slug = '', grande = false }) {
  const Icone = ICONES_CATEGORIA[categoria] || Newspaper;
  const h = hash(slug || categoria);
  const estilo = {
    '--capa-angulo': `${(h % 6) * 30 + 120}deg`,
    '--capa-x': `${8 + (h % 5) * 6}%`,
    '--capa-y': `${10 + ((h >> 3) % 4) * 8}%`,
  };

  return (
    <div className={`capa capa-${categoria || 'geral'}${grande ? ' capa-grande' : ''}`} style={estilo} aria-hidden="true">
      <span className="capa-pixel capa-pixel-a" />
      <span className="capa-pixel capa-pixel-b" />
      <Icone className="capa-icone" size={grande ? 72 : 44} strokeWidth={1.25} />
      <span className="capa-rotulo">{rotuloCategoria(categoria)}</span>
    </div>
  );
}

export function nFontes(post) {
  const n = post.fontes?.length || 0;
  return n === 1 ? '1 fonte' : `${n} fontes`;
}

export default function CartaoPost({ post, resumo, destaque = false }) {
  const titleId = `cartao-${post.slug}`;
  return (
    <article className={`cartao${destaque ? ' cartao-destaque' : ''}`} aria-labelledby={titleId}>
      <a className="cartao-capa" href={urlDoPost(post.slug)} tabIndex={-1} aria-hidden="true">
        <CapaCategoria categoria={post.categoria} slug={post.slug} grande={destaque} />
      </a>
      <div className="cartao-corpo">
        <span className="cartao-categoria">{rotuloCategoria(post.categoria)}</span>
        <h3 id={titleId}>
          <a href={urlDoPost(post.slug)}>{post.titulo}</a>
        </h3>
        <p className="cartao-resumo">{post.resumo}</p>
        <ul className="cartao-meta">
          <li><time dateTime={post.publicadoEm}>{dataRelativa(post.publicadoEm)}</time></li>
          <li><Clock size={13} aria-hidden="true" /> {post.tempoLeitura} min de leitura</li>
          {post.fontes?.length ? <li>{nFontes(post)}</li> : null}
          {resumo ? (
            <li className="cartao-social">
              <span title="Curtidas"><Heart size={13} aria-hidden="true" /> {resumo.curtidas}<span className="sr-only"> curtidas</span></span>
              <span title="Comentários"><MessageCircle size={13} aria-hidden="true" /> {resumo.comentarios}<span className="sr-only"> comentários</span></span>
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
