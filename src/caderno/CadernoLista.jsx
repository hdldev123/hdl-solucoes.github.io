import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import CadernoLayout from './CadernoLayout.jsx';
import CartaoPost from './CartaoPost.jsx';
import { buscarResumo } from './api.js';
import Newsletter, { RetornoNewsletter } from './Newsletter.jsx';
import {
  CATEGORIAS, definirMeta, dataRelativa, escolherDestaque, textoPlano, useIndice,
} from './dados.js';
import { rotuloProximaAtualizacao } from './agenda.js';

const POR_PAGINA = 12;

function lerFiltrosDaUrl() {
  const p = new URLSearchParams(window.location.search);
  const categoria = p.get('categoria');
  return {
    categoria: categoria && CATEGORIAS[categoria] ? categoria : 'todas',
    q: (p.get('q') || '').slice(0, 80),
  };
}

function useResumos(slugs) {
  const [resumos, setResumos] = useState({});
  const chave = slugs.join(',');

  useEffect(() => {
    const faltantes = slugs.filter((s) => !(s in resumos));
    if (!faltantes.length) return undefined;
    let cancelado = false;
    buscarResumo(faltantes.slice(0, 30)).then((r) => {
      if (!cancelado && r.ok) setResumos((atual) => ({ ...atual, ...r.dados }));
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return resumos;
}

function EsqueletoLista() {
  return (
    <div className="esqueleto" role="status" aria-label="Carregando notícias">
      <div className="esqueleto-destaque" />
      <div className="esqueleto-grade">
        {[0, 1, 2].map((i) => <div className="esqueleto-cartao" key={i} />)}
      </div>
    </div>
  );
}

export default function CadernoLista() {
  const { estado, indice, recarregar } = useIndice();
  const [filtros, setFiltros] = useState(lerFiltrosDaUrl);
  const [busca, setBusca] = useState(filtros.q);
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  useEffect(() => {
    definirMeta(
      'Caderno HDL | Notícias de tecnologia explicadas em português',
      'As notícias de tecnologia que importam, explicadas em português. Atualizado a cada 4 horas pelo Caderno HDL.',
    );
  }, []);

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.q === busca.trim() ? f : { ...f, q: busca.trim() }));
      setVisiveis(POR_PAGINA);
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  // URL reflete filtros
  useEffect(() => {
    const p = new URLSearchParams();
    if (filtros.categoria !== 'todas') p.set('categoria', filtros.categoria);
    if (filtros.q) p.set('q', filtros.q);
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [filtros]);

  const posts = useMemo(() => indice?.posts ?? [], [indice]);

  const contagens = useMemo(() => {
    const c = {};
    posts.forEach((p) => { c[p.categoria] = (c[p.categoria] || 0) + 1; });
    return c;
  }, [posts]);

  const filtrados = useMemo(() => {
    const termo = textoPlano(filtros.q);
    return posts.filter((p) => {
      if (filtros.categoria !== 'todas' && p.categoria !== filtros.categoria) return false;
      if (!termo) return true;
      return textoPlano(`${p.titulo} ${p.resumo} ${(p.tags || []).join(' ')}`).includes(termo);
    });
  }, [posts, filtros]);

  const semFiltro = filtros.categoria === 'todas' && !filtros.q;
  const destaque = semFiltro ? escolherDestaque(filtrados) : null;
  const restantes = destaque ? filtrados.filter((p) => p.slug !== destaque.slug) : filtrados;
  const exibidos = restantes.slice(0, visiveis);

  const resumos = useResumos([destaque?.slug, ...exibidos.map((p) => p.slug)].filter(Boolean));

  const escolherCategoria = (categoria) => {
    setFiltros((f) => ({ ...f, categoria }));
    setVisiveis(POR_PAGINA);
  };

  const limpar = () => {
    setBusca('');
    setFiltros({ categoria: 'todas', q: '' });
  };

  const categoriasComPosts = Object.keys(CATEGORIAS).filter((id) => contagens[id]);

  return (
    <CadernoLayout>
      <div className="caderno-lista">
        <header className="caderno-cabecalho">
          <span className="eyebrow">Caderno HDL</span>
          <h1>As notícias de tecnologia que importam, explicadas em português.</h1>
          <p className="caderno-subtitulo">
            Curadoria automática em fontes confiáveis, com texto original e links para cada fonte.
          </p>
          {indice?.atualizadoEm ? (
            <p className="caderno-status">
              <span>Atualizado <time dateTime={indice.atualizadoEm}>{dataRelativa(indice.atualizadoEm)}</time></span>
              <span>Próxima atualização {rotuloProximaAtualizacao(indice.proximaAtualizacao)}</span>
            </p>
          ) : (
            <p className="caderno-status"><span>Atualizado a cada 4 horas, das 6h às 22h</span></p>
          )}
        </header>

        <RetornoNewsletter />

        {estado === 'carregando' ? <EsqueletoLista /> : null}

        {estado === 'erro' ? (
          <div className="estado-vazio" role="alert">
            <h2>Não foi possível carregar as notícias.</h2>
            <p>Verifique sua conexão e tente novamente.</p>
            <button type="button" className="botao-caderno botao-caderno-primario" onClick={recarregar}>
              <RefreshCw size={16} aria-hidden="true" /> Tentar de novo
            </button>
          </div>
        ) : null}

        {estado === 'ok' && posts.length === 0 ? (
          <div className="estado-vazio">
            <h2>Primeiras notícias a caminho</h2>
            <p>
              As primeiras notícias chegam na próxima rodada — o Caderno é atualizado a cada 4 horas,
              das 6h às 22h.
            </p>
            <a className="text-link" href="/">Voltar ao site</a>
          </div>
        ) : null}

        {estado === 'ok' && posts.length > 0 ? (
          <>
            <div className="caderno-filtros">
              <form
                className="busca"
                role="search"
                onSubmit={(e) => e.preventDefault()}
              >
                <label className="sr-only" htmlFor="busca-caderno">Buscar no Caderno</label>
                <Search size={18} aria-hidden="true" />
                <input
                  id="busca-caderno"
                  type="search"
                  name="q"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Buscar por título, resumo ou tag…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca ? (
                  <button type="button" className="busca-limpar" aria-label="Limpar busca" onClick={() => setBusca('')}>
                    <X size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </form>

              <div className="chips" role="group" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={filtros.categoria === 'todas'}
                  onClick={() => escolherCategoria('todas')}
                >
                  Todas <span>{posts.length}</span>
                </button>
                {categoriasComPosts.map((id) => (
                  <button
                    type="button"
                    className="chip"
                    key={id}
                    aria-pressed={filtros.categoria === id}
                    onClick={() => escolherCategoria(id)}
                  >
                    {CATEGORIAS[id]} <span>{contagens[id]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {filtrados.length === 1 ? '1 notícia encontrada' : `${filtrados.length} notícias encontradas`}
            </p>

            {filtrados.length === 0 ? (
              <div className="estado-vazio">
                <h2>Nenhuma notícia encontrada</h2>
                <p>Tente outro termo ou remova os filtros.</p>
                <button type="button" className="botao-caderno" onClick={limpar}>Limpar filtros</button>
              </div>
            ) : (
              <>
                {destaque ? (
                  <section aria-label="Em destaque" className="bloco-destaque">
                    <CartaoPost post={destaque} resumo={resumos[destaque.slug]} destaque />
                  </section>
                ) : null}

                <div className="nl-na-lista"><Newsletter /></div>

                {exibidos.length ? (
                  <section aria-label="Mais notícias">
                    <div className="grade-cartoes">
                      {exibidos.map((post) => (
                        <CartaoPost key={post.slug} post={post} resumo={resumos[post.slug]} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {restantes.length > exibidos.length ? (
                  <div className="carregar-mais">
                    <button type="button" className="botao-caderno" onClick={() => setVisiveis((n) => n + POR_PAGINA)}>
                      Carregar mais ({restantes.length - exibidos.length})
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </div>
    </CadernoLayout>
  );
}
