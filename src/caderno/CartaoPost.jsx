import { Clock, Heart, MessageCircle } from 'lucide-react';
import CapaGerada from './CapaGerada.jsx';
import { dataRelativa, rotuloCategoria, urlDoPost } from './dados.js';

export function nFontes(post) {
  const n = post.fontes?.length || 0;
  return n === 1 ? '1 fonte' : `${n} fontes`;
}

export default function CartaoPost({ post, resumo, destaque = false }) {
  const titleId = `cartao-${post.slug}`;
  return (
    <article className={`cartao${destaque ? ' cartao-destaque' : ''}`} aria-labelledby={titleId}>
      <a className="cartao-capa" href={urlDoPost(post.slug)} tabIndex={-1} aria-hidden="true">
        <CapaGerada categoria={post.categoria} slug={post.slug} palavra={post.tags?.[0]} cheia={destaque} />
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
