import { useEffect, useRef, useState } from 'react';
import {
  Check, Copy, Download, FileText, Headphones, Heart, Link2, Mail, MessageCircle, Printer, Share2,
} from 'lucide-react';
import { urlCanonica } from '../dados.js';
import { baixarArquivo, montarMarkdown, montarTxt } from './exportar.js';

/** Popover acessível: botão + painel. Esc fecha e devolve o foco; clique fora fecha. */
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
        className="acao"
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={aoAbrirManual || aoAlternar}
      >
        <Icone size={18} aria-hidden="true" />
        <span>{rotulo}</span>
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

export default function BarraAcoes({
  post, leitor, curtidas, curtiu, curtindo, aoCurtir, aviso, aoComentar, comentariosDisponiveis, totalComentarios,
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
    setTimeout(() => setAnimar(false), 450);
    aoCurtir();
  };

  const nomeArquivo = `caderno-hdl-${post.slug}`;
  const ouvindo = leitor.estado !== 'parado';

  return (
    <div className="barra-acoes" role="toolbar" aria-label="Ações do artigo">
      <button
        type="button"
        className={`acao${ouvindo ? ' acao-ativa' : ''}`}
        disabled={!leitor.suportado}
        aria-pressed={ouvindo}
        title={leitor.suportado ? undefined : 'Seu navegador não oferece leitura em voz alta.'}
        onClick={() => (ouvindo ? leitor.parar() : leitor.tocar())}
      >
        <Headphones size={18} aria-hidden="true" />
        <span>{ouvindo ? 'Parar' : 'Ouvir'}</span>
      </button>

      <button
        type="button"
        className={`acao acao-curtir${curtiu ? ' acao-ativa' : ''}${animar ? ' acao-pulso' : ''}`}
        aria-pressed={curtiu}
        disabled={curtindo}
        onClick={aoClicarCurtir}
      >
        <Heart size={18} aria-hidden="true" fill={curtiu ? 'currentColor' : 'none'} />
        <span>Curtir</span>
        <span className="acao-contador" aria-label={`${curtidas} curtidas`}>{curtidas}</span>
      </button>

      <button type="button" className="acao" onClick={aoComentar}>
        <MessageCircle size={18} aria-hidden="true" />
        <span>Comentar</span>
        {comentariosDisponiveis ? <span className="acao-contador" aria-label={`${totalComentarios} comentários`}>{totalComentarios}</span> : null}
      </button>

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
  );
}
