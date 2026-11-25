import { useEffect, useRef, useState } from 'react';
import {
  Check, Copy, Download, FileText, Headphones, Heart, Link2, Mail, MessageCircle, Printer, Share2, Square,
} from 'lucide-react';
import { urlCanonica } from '../dados.js';
import { baixarArquivo, montarMarkdown, montarTxt } from './exportar.js';

/** Popover acessível: botão (só ícone) + painel acima da barra. Esc fecha e devolve o foco; clique fora fecha. */
function Popover({ rotulo, icone: Icone, painelRotulo, children, aberto, aoAlternar, aoFechar, aoAbrirManual }) {
  const raiz = useRef(null);
  const botao = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        aoFechar();
        botao.current?.focus();
      }
    };
    const onPointer = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) aoFechar();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [aberto, aoFechar]);

  return (
    <div className="acao-popover" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="acao acao-icone"
        data-tip={rotulo}
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={aoAbrirManual || aoAlternar}
      >
        <Icone size={19} aria-hidden="true" />
      </button>
      {aberto ? (
        <div className="popover-painel" role="group" aria-label={painelRotulo}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function IconeWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21l1.65-4.9A8.5 8.5 0 1 1 8 19.4L3 21z" />
      <path d="M9 10c0 3 2 5 5 5l1.2-1.2-1.7-1-.8.6c-.9-.4-1.6-1.1-2-2l.6-.8-1-1.7L9 10z" />
    </svg>
  );
}

/** Mostra a barra depois do cabeçalho e a esconde quando comentários ou rodapé aparecem. */
function useVisibilidade(cabecalhoRef, comentariosRef) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const cab = cabecalhoRef.current;
    if (!cab || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return undefined;
    }
    const estado = { passou: false, comentarios: false, rodape: false };
    const aplicar = () => setVisivel(estado.passou && !estado.comentarios && !estado.rodape);

    const obsCab = new IntersectionObserver(([e]) => {
      estado.passou = !e.isIntersecting && e.boundingClientRect.bottom < 120;
      aplicar();
    }, { rootMargin: '-80px 0px 0px 0px' }); // descontando o cabeçalho fixo do site
    obsCab.observe(cab);

    const obsFim = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { estado[e.target === comentariosRef.current ? 'comentarios' : 'rodape'] = e.isIntersecting; });
      aplicar();
    });
    if (comentariosRef.current) obsFim.observe(comentariosRef.current);
    const rodape = document.querySelector('.site-footer');
    if (rodape) obsFim.observe(rodape);

    return () => { obsCab.disconnect(); obsFim.disconnect(); };
  }, [cabecalhoRef, comentariosRef]);

  return visivel;
}

export default function BarraAcoes({
  post, leitor, curtidas, curtiu, curtindo, aoCurtir, aviso, aoComentar, comentariosDisponiveis, totalComentarios,
  cabecalhoRef, comentariosRef, player,
}) {
  const [aberto, setAberto] = useState(null); // 'compartilhar' | 'baixar' | null
  const [copiado, setCopiado] = useState(false);
  const [animar, setAnimar] = useState(false);
  const fechar = () => setAberto(null);

  const url = urlCanonica(post.slug);
  const alternar = (nome) => setAberto((atual) => (atual === nome ? null : nome));

  const compartilhar = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.titulo, text: post.resumo, url });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    alternar('compartilhar');
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement('textarea');
      t.value = url;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch { /* ignorado */ }
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(post.titulo);
  const redes = [
    { nome: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${post.titulo} ${url}`)}`, icone: <IconeWhatsApp /> },
    { nome: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icone: <Share2 size={16} aria-hidden="true" /> },
    { nome: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, icone: <Share2 size={16} aria-hidden="true" /> },
    { nome: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, icone: <Share2 size={16} aria-hidden="true" /> },
    { nome: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icone: <Share2 size={16} aria-hidden="true" /> },
    { nome: 'E-mail', href: `mailto:?subject=${t}&body=${encodeURIComponent(`${post.resumo}\n\n${url}`)}`, icone: <Mail size={16} aria-hidden="true" /> },
  ];

  const aoClicarCurtir = () => {
    setAnimar(true);
    setTimeout(() => setAnimar(false), 520);
    aoCurtir();
  };

  const nomeArquivo = `caderno-hdl-${post.slug}`;
  const ouvindo = leitor.estado !== 'parado';
  // Com leitura em andamento o conjunto (player + barra) fica sempre à mão.
  const visivel = useVisibilidade(cabecalhoRef, comentariosRef) || ouvindo;

  return (
    <div className={`dock${visivel ? ' dock-visivel' : ''}`}>
      {player}
      <div className="barra-acoes" role="toolbar" aria-label="Ações do artigo">
        <button
          type="button"
          className={`acao acao-ouvir${ouvindo ? ' acao-ouvir-ativo' : ''}`}
          disabled={!leitor.suportado}
          aria-pressed={ouvindo}
          aria-label={ouvindo ? 'Parar leitura em voz alta' : 'Ouvir notícia'}
          data-tip={ouvindo ? 'Parar leitura' : 'Ouvir notícia'}
          title={leitor.suportado ? undefined : 'Seu navegador não oferece leitura em voz alta.'}
          onClick={() => (ouvindo ? leitor.parar() : leitor.tocar())}
        >
          {ouvindo ? <Square size={15} aria-hidden="true" fill="currentColor" /> : <Headphones size={19} aria-hidden="true" />}
          <span className="acao-rotulo">{ouvindo ? 'Parar' : 'Ouvir'}</span>
        </button>

        <i className="barra-sep" aria-hidden="true" />

        <button
          type="button"
          className={`acao acao-curtir${curtiu ? ' acao-curtido' : ''}${animar ? ' acao-pulso' : ''}`}
          aria-pressed={curtiu}
          aria-label={`Curtir (${curtidas} ${curtidas === 1 ? 'curtida' : 'curtidas'})`}
          data-tip={curtiu ? 'Descurtir' : 'Curtir'}
          disabled={curtindo}
          onClick={aoClicarCurtir}
        >
          <Heart size={19} aria-hidden="true" fill={curtiu ? 'currentColor' : 'none'} />
          <span className="acao-contador" aria-hidden="true">{curtidas}</span>
        </button>

        <button
          type="button"
          className="acao"
          aria-label={comentariosDisponiveis ? `Comentar (${totalComentarios} ${totalComentarios === 1 ? 'comentário' : 'comentários'})` : 'Comentar'}
          data-tip="Comentar"
          onClick={aoComentar}
        >
          <MessageCircle size={19} aria-hidden="true" />
          {comentariosDisponiveis ? <span className="acao-contador" aria-hidden="true">{totalComentarios}</span> : null}
        </button>

        <i className="barra-sep" aria-hidden="true" />

        <Popover
          rotulo="Compartilhar"
          icone={Share2}
          painelRotulo="Compartilhar notícia"
          aberto={aberto === 'compartilhar'}
          aoAlternar={() => alternar('compartilhar')}
          aoAbrirManual={compartilhar}
          aoFechar={fechar}
        >
          {redes.map((r) => (
            <a key={r.nome} href={r.href} target="_blank" rel="noopener noreferrer" className="popover-item" onClick={fechar}>
              {r.icone}<span>{r.nome}</span>
            </a>
          ))}
          <button type="button" className="popover-item" onClick={copiar}>
            {copiado ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
            <span>{copiado ? 'Link copiado' : 'Copiar link'}</span>
          </button>
          <p className="sr-only" role="status" aria-live="polite">{copiado ? 'Link copiado' : ''}</p>
        </Popover>

        <Popover
          rotulo="Baixar"
          icone={Download}
          painelRotulo="Baixar notícia"
          aberto={aberto === 'baixar'}
          aoAlternar={() => alternar('baixar')}
          aoFechar={fechar}
        >
          <button type="button" className="popover-item" onClick={() => { fechar(); setTimeout(() => window.print(), 60); }}>
            <Printer size={16} aria-hidden="true" /><span>Salvar em PDF</span>
          </button>
          <button type="button" className="popover-item" onClick={() => { baixarArquivo(`${nomeArquivo}.txt`, montarTxt(post), 'text/plain'); fechar(); }}>
            <FileText size={16} aria-hidden="true" /><span>Transcrição (.txt)</span>
          </button>
          <button type="button" className="popover-item" onClick={() => { baixarArquivo(`${nomeArquivo}.md`, montarMarkdown(post), 'text/markdown'); fechar(); }}>
            <Copy size={16} aria-hidden="true" /><span>Markdown (.md)</span>
          </button>
        </Popover>

        {aviso ? <p className="acoes-aviso" role="status">{aviso}</p> : null}
      </div>
    </div>
  );
}
