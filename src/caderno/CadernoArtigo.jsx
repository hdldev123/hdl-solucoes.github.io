import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight, Clock, Headphones, Minus, Plus, RefreshCw, Sparkles } from 'lucide-react';
import CadernoLayout from './CadernoLayout.jsx';
import CapaGerada from './CapaGerada.jsx';
import CartaoPost from './CartaoPost.jsx';
import BarraAcoes from './artigo/BarraAcoes.jsx';
import Comentarios from './artigo/Comentarios.jsx';
import PlayerVoz from './artigo/PlayerVoz.jsx';
import { useLeitorVoz } from './artigo/useLeitorVoz.js';
import { AVISO_IA } from './artigo/exportar.js';
import {
  alternarCurtidaLocal, buscarInteracoes, curtidaLocal, curtir, gravarPreferencia, lerPreferencia,
} from './api.js';
import {
  carregarIndice, carregarPost, dataAbsoluta, dataHoraAbsoluta, definirMeta, rotuloCategoria, slugDaUrl,
  urlCanonica,
} from './dados.js';

const CHAVE_FONTE = 'hdl-caderno-fonte';
const NIVEIS_FONTE = [0.9, 1, 1.1, 1.22, 1.36];

function hostDe(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function ProgressoLeitura({ alvoRef }) {
  const barra = useRef(null);

  useEffect(() => {
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const alvo = alvoRef.current;
      if (!alvo || !barra.current) return;
      const r = alvo.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const feito = Math.min(Math.max(-r.top + window.innerHeight * 0.3, 0), Math.max(total, 1));
      barra.current.style.transform = `scaleX(${total > 0 ? feito / total : 0})`;
    };
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar); };
    atualizar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [alvoRef]);

  return (
    <div className="progresso-leitura" aria-hidden="true">
      <i ref={barra} />
    </div>
  );
}

function SeloIA() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="selo-ia">
      <button type="button" aria-expanded={aberto} aria-controls="selo-ia-detalhe" onClick={() => setAberto((v) => !v)}>
        <Sparkles size={15} aria-hidden="true" />
        <span>{AVISO_IA.replace(/\.$/, '')}</span>
        <ChevronRight className="selo-seta" size={15} aria-hidden="true" />
      </button>
      <div id="selo-ia-detalhe" className="selo-ia-detalhe" hidden={!aberto}>
        <p>
          O Caderno HDL acompanha automaticamente fontes confiáveis de tecnologia. Uma inteligência
          artificial escreve um texto original em português, usando apenas os fatos publicados nessas
          fontes, e cada texto passa por uma verificação automática de cópia para não reproduzir a
          matéria original. As fontes são sempre citadas e linkadas ao final.
        </p>
      </div>
    </div>
  );
}

function ControleFonte({ nivel, setNivel }) {
  return (
    <div className="controle-fonte" role="group" aria-label="Tamanho do texto">
      <button type="button" onClick={() => setNivel(Math.max(0, nivel - 1))} disabled={nivel === 0} aria-label="Diminuir texto">
        <Minus size={14} aria-hidden="true" /><span aria-hidden="true">A</span>
      </button>
      <button type="button" onClick={() => setNivel(Math.min(NIVEIS_FONTE.length - 1, nivel + 1))} disabled={nivel === NIVEIS_FONTE.length - 1} aria-label="Aumentar texto">
        <Plus size={14} aria-hidden="true" /><span aria-hidden="true">A</span>
      </button>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="artigo-esqueleto" role="status" aria-label="Carregando notícia">
      <i style={{ width: '30%' }} />
      <i className="esq-titulo" />
      <i className="esq-titulo" style={{ width: '70%' }} />
      <i style={{ width: '90%' }} />
      <i className="esq-capa" />
      {[0, 1, 2, 3].map((n) => <i key={n} className="esq-linha" />)}
    </div>
  );
}

function ArtigoConteudo({ post, indice }) {
  const slug = post.slug;
  const artigoRef = useRef(null);
  const comentariosRef = useRef(null);
  const cabecalhoRef = useRef(null);
  const leitor = useLeitorVoz(post);

  const [nivelFonte, setNivelFonte] = useState(() => {
    const salvo = Number(lerPreferencia(CHAVE_FONTE));
    return Number.isInteger(salvo) && salvo >= 0 && salvo < NIVEIS_FONTE.length ? salvo : 1;
  });

  const [inter, setInter] = useState({ estado: 'carregando', curtidas: 0, curtiu: false, comentarios: [] });
  const [curtindo, setCurtindo] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => { gravarPreferencia(CHAVE_FONTE, String(nivelFonte)); }, [nivelFonte]);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    definirMeta(`${post.titulo} | Caderno HDL`, post.resumo);
    const canonico = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
    canonico.setAttribute('href', urlCanonica(slug));
  }, [post, slug]);

  useEffect(() => {
    let cancelado = false;
    buscarInteracoes(slug).then((r) => {
      if (cancelado) return;
      if (r.ok) {
        setInter({
          estado: 'ok',
          curtidas: r.dados.curtidas ?? 0,
          curtiu: Boolean(r.dados.curtiu),
          comentarios: r.dados.comentarios ?? [],
        });
      } else {
        const local = curtidaLocal(slug);
        setInter({ estado: 'indisponivel', curtidas: local ? 1 : 0, curtiu: local, comentarios: [] });
      }
    });
    return () => { cancelado = true; };
  }, [slug]);

  const aoCurtir = async () => {
    if (curtindo) return;
    setAviso('');
    const antes = { curtidas: inter.curtidas, curtiu: inter.curtiu };
    const agora = !antes.curtiu;
    setInter((s) => ({ ...s, curtiu: agora, curtidas: Math.max(0, s.curtidas + (agora ? 1 : -1)) }));
    setCurtindo(true);

    if (inter.estado === 'indisponivel') {
      alternarCurtidaLocal(slug);
      setAviso('Curtida salva apenas neste dispositivo.');
      setCurtindo(false);
      return;
    }

    const r = await curtir(slug);
    setCurtindo(false);
    if (r.ok) {
      setInter((s) => ({ ...s, curtidas: r.dados.curtidas, curtiu: r.dados.curtiu }));
    } else if (r.indisponivel) {
      alternarCurtidaLocal(slug);
      setAviso('Curtida salva apenas neste dispositivo.');
    } else {
      setInter((s) => ({ ...s, ...antes }));
      setAviso(r.erro);
    }
  };

  const irParaComentarios = useCallback(() => {
    const el = comentariosRef.current;
    if (!el) return;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, []);

  const aoNovoComentario = (c) => setInter((s) => ({ ...s, comentarios: [c, ...s.comentarios] }));

  const relacionadas = (indice?.posts || [])
    .filter((p) => p.slug !== slug && p.categoria === post.categoria)
    .slice(0, 3);

  const url = urlCanonica(slug);
  const tamanho = { '--fonte-leitura': `${NIVEIS_FONTE[nivelFonte]}rem` };

  return (
    <>
      <ProgressoLeitura alvoRef={artigoRef} />

      <div className="artigo-pagina">
        <article className="artigo" ref={artigoRef} style={tamanho}>
          <nav className="breadcrumb" aria-label="Você está em">
            <ol>
              <li><a href="/caderno/">Caderno HDL</a></li>
              <li aria-hidden="true"><ChevronRight size={14} /></li>
              <li><a href={`/caderno/?categoria=${post.categoria}`}>{rotuloCategoria(post.categoria)}</a></li>
            </ol>
          </nav>

          <header className="artigo-cabecalho" ref={cabecalhoRef}>
            <span className="artigo-categoria">{rotuloCategoria(post.categoria)}</span>
            <h1 id="artigo-titulo">{post.titulo}</h1>
            <p className="artigo-subtitulo" id="artigo-subtitulo">{post.subtitulo}</p>

            <div className="artigo-meta">
              <time dateTime={post.publicadoEm}>{dataHoraAbsoluta(post.publicadoEm)}</time>
              <span><Clock size={14} aria-hidden="true" /> {post.tempoLeitura} min de leitura</span>
              {post.fontes?.length ? (
                <span>Fontes: {post.fontes.map((f) => f.nome).join(', ')}</span>
              ) : null}
              <ControleFonte nivel={nivelFonte} setNivel={setNivelFonte} />
            </div>

            <button
              type="button"
              className="ouvir-inline"
              disabled={!leitor.suportado}
              aria-pressed={leitor.estado !== 'parado'}
              onClick={() => (leitor.estado !== 'parado' ? leitor.parar() : leitor.tocar())}
            >
              <Headphones size={17} aria-hidden="true" />
              {leitor.estado !== 'parado' ? 'Parar leitura' : 'Ouvir notícia'}
            </button>
          </header>

          <CapaGerada categoria={post.categoria} slug={post.slug} palavra={post.tags?.[0]} variante="hero" />

          <SeloIA />

          {post.pontosChave?.length ? (
            <aside className="pontos-chave" aria-labelledby="artigo-pontos">
              <h2 id="artigo-pontos">Pontos-chave</h2>
              <ul>
                {post.pontosChave.map((p, i) => <li key={p} id={`ponto-${i}`}>{p}</li>)}
              </ul>
            </aside>
          ) : null}

          <div className="artigo-corpo">
            {(post.secoes || []).map((secao, si) => (
              <section key={`${si}-${secao.titulo || 'lide'}`}>
                {secao.titulo ? <h2 id={`secao-${si}-titulo`}>{secao.titulo}</h2> : null}
                {(secao.paragrafos || []).map((p, pi) => (
                  <p key={pi} id={`par-${si}-${pi}`}>{p}</p>
                ))}
              </section>
            ))}
          </div>

          {post.porQueImporta ? (
            <aside className="por-que-importa" aria-labelledby="artigo-importa">
              <h2 id="artigo-importa">Por que importa</h2>
              <p id="artigo-importa-texto">{post.porQueImporta}</p>
            </aside>
          ) : null}

          {post.fontes?.length ? (
            <section className="fontes" id="artigo-fontes" aria-labelledby="fontes-titulo">
              <h2 id="fontes-titulo">Fontes</h2>
              <ul>
                {post.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                      <strong>{f.nome}</strong>
                      {f.titulo ? <span className="fonte-titulo">{f.titulo}</span> : null}
                      <span className="fonte-data">
                        {f.publicadoEm ? `${dataAbsoluta(f.publicadoEm)} · ` : ''}{hostDe(f.url)}
                        <ArrowUpRight size={13} aria-hidden="true" />
                        <span className="sr-only"> (abre em nova aba)</span>
                      </span>
                    </a>
                    <span className="url-impressao">{f.url}</span>
                  </li>
                ))}
              </ul>
              <p className="fontes-nota">Leia a cobertura completa na fonte original.</p>
            </section>
          ) : null}

          <p className="artigo-ia-nota">
            {AVISO_IA} Atualizado em {dataAbsoluta(post.atualizadoEm || post.publicadoEm)}.
          </p>
          <p className="rodape-impressao">Caderno HDL — {url}</p>
        </article>

        <div className="artigo-extra">
          <Comentarios
            ref={comentariosRef}
            slug={slug}
            estado={inter.estado}
            comentarios={inter.comentarios}
            aoNovo={aoNovoComentario}
          />

          <section className="relacionadas" aria-labelledby="relacionadas-titulo">
            <div className="relacionadas-topo">
              <h2 id="relacionadas-titulo">{relacionadas.length ? 'Leia também' : 'Mais notícias'}</h2>
              <a className="text-link" href="/caderno/">Ver todas as notícias <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            {relacionadas.length ? (
              <div className="grade-cartoes">
                {relacionadas.map((p) => <CartaoPost key={p.slug} post={p} />)}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <BarraAcoes
        post={post}
        leitor={leitor}
        curtidas={inter.curtidas}
        curtiu={inter.curtiu}
        curtindo={curtindo}
        aoCurtir={aoCurtir}
        aviso={aviso}
        aoComentar={irParaComentarios}
        cabecalhoRef={cabecalhoRef}
        comentariosRef={comentariosRef}
        player={<PlayerVoz leitor={leitor} />}
        comentariosDisponiveis={inter.estado === 'ok'}
        totalComentarios={inter.comentarios.length}
      />

    </>
  );
}

export default function CadernoArtigo() {
  const slug = slugDaUrl(window.location.pathname);
  const [estado, setEstado] = useState({ tipo: 'carregando', post: null, indice: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    definirMeta('Caderno HDL | Notícias de tecnologia', null);
    if (!slug) {
      setEstado({ tipo: 'naoencontrado', post: null, indice: null });
      return undefined;
    }
    setEstado({ tipo: 'carregando', post: null, indice: null });
    Promise.all([carregarPost(slug), carregarIndice().catch(() => null)])
      .then(([post, indice]) => { if (!cancelado) setEstado({ tipo: 'ok', post, indice }); })
      .catch((erro) => {
        if (cancelado) return;
        setEstado({ tipo: erro?.status === 404 ? 'naoencontrado' : 'erro', post: null, indice: null });
      });
    return () => { cancelado = true; };
  }, [slug, tentativa]);

  useEffect(() => {
    if (estado.tipo === 'naoencontrado') definirMeta('Notícia não encontrada | Caderno HDL', null);
  }, [estado.tipo]);

  return (
    <CadernoLayout>
      {estado.tipo === 'carregando' ? <div className="artigo-pagina artigo-pagina-estado"><Esqueleto /></div> : null}

      {estado.tipo === 'naoencontrado' ? (
        <div className="estado-vazio estado-pagina">
          <h1>Notícia não encontrada</h1>
          <p>O endereço pode estar incorreto ou a notícia foi removida.</p>
          <a className="botao-caderno botao-caderno-primario" href="/caderno/">
            <ArrowLeft size={16} aria-hidden="true" /> Ir para o Caderno
          </a>
        </div>
      ) : null}

      {estado.tipo === 'erro' ? (
        <div className="estado-vazio estado-pagina" role="alert">
          <h1>Não foi possível carregar a notícia</h1>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" className="botao-caderno botao-caderno-primario" onClick={() => setTentativa((n) => n + 1)}>
            <RefreshCw size={16} aria-hidden="true" /> Tentar de novo
          </button>
          <a className="text-link" href="/caderno/">Ver todas as notícias</a>
        </div>
      ) : null}

      {estado.tipo === 'ok' ? <ArtigoConteudo post={estado.post} indice={estado.indice} /> : null}
    </CadernoLayout>
  );
}
