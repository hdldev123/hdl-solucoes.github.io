import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Info, Loader2, Mail, X } from 'lucide-react';
import { assinarNewsletter, cancelarNewsletter } from './api.js';
import '../estilos/newsletter.css';

const MSG_SUCESSO = 'Quase lá! Enviamos um link de confirmação para seu e-mail.';
const MSG_CANCELAR = 'Se o endereço estiver inscrito, enviamos um link para confirmar o cancelamento.';
const MSG_ERRO = 'Não foi possível assinar agora.';
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function useFormulario(acao) {
  const montadoEm = useRef(Date.now());
  const campoRef = useRef(null);
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState('ocioso'); // ocioso | enviando | sucesso | erro
  const [mensagem, setMensagem] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    if (estado === 'enviando') return;
    const valor = email.trim();
    if (!EMAIL_OK.test(valor) || valor.length > 254) {
      setEstado('erro');
      setMensagem('Informe um e-mail válido, como nome@exemplo.com.');
      campoRef.current?.focus();
      return;
    }
    setEstado('enviando');
    setMensagem('');
    const site = e.currentTarget.elements.site?.value || '';
    const chamar = acao === 'cancelar' ? cancelarNewsletter : assinarNewsletter;
    const r = await chamar({ email: valor, site, tempo: Date.now() - montadoEm.current });
    if (r.ok) {
      setEstado('sucesso');
      setMensagem(acao === 'cancelar' ? MSG_CANCELAR : MSG_SUCESSO);
    } else {
      setEstado('erro');
      // Sem rede ou sem /api (dev): mensagem amigável; senão, a mensagem da API.
      setMensagem(r.status === 0 || r.status === 404 || !r.erro ? MSG_ERRO : r.erro);
    }
  };

  return { email, setEmail, estado, mensagem, enviar, campoRef };
}

function Campos({ acao, form, idCampo, idMsg, rotuloBotao }) {
  const { email, setEmail, estado, enviar, campoRef } = form;
  const enviando = estado === 'enviando';
  return (
    <form className="nl-form" onSubmit={enviar} noValidate>
      <div className="nl-campo">
        <label className="sr-only" htmlFor={idCampo}>E-mail</label>
        <Mail size={18} aria-hidden="true" />
        <input
          ref={campoRef}
          id={idCampo}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck="false"
          autoCapitalize="none"
          placeholder="seu@email.com…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={estado === 'erro' ? 'true' : undefined}
          aria-describedby={idMsg}
          readOnly={enviando}
        />
      </div>
      {/* honeypot: invisível para pessoas */}
      <div className="nl-armadilha" aria-hidden="true">
        <label>Site <input type="text" name="site" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>
      <button type="submit" className="nl-botao" disabled={enviando} data-acao={acao}>
        {enviando ? <Loader2 className="girar" size={17} aria-hidden="true" /> : null}
        <span>{rotuloBotao}{enviando ? '…' : ''}</span>
      </button>
    </form>
  );
}

function Mensagem({ id, estado, mensagem }) {
  return (
    <p
      id={id}
      className={`nl-msg${estado === 'erro' ? ' nl-msg-erro' : ''}${estado === 'sucesso' ? ' nl-msg-ok' : ''}`}
      role={estado === 'erro' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {mensagem ? (
        <>
          {estado === 'sucesso' ? <CheckCircle2 size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
          <span>{mensagem}</span>
        </>
      ) : null}
    </p>
  );
}

export default function Newsletter({ variante = 'cartao', acao = 'assinar' }) {
  const form = useFormulario(acao);
  const base = useId();
  const idCampo = `${base}-email`;
  const idMsg = `${base}-msg`;
  const cancelando = acao === 'cancelar';
  const sucesso = form.estado === 'sucesso';

  if (variante === 'compacta') {
    return (
      <aside className="nl nl-compacta" aria-labelledby={`${base}-t`}>
        <span className="nl-icone" aria-hidden="true"><Mail size={20} /></span>
        <div className="nl-texto">
          <h3 id={`${base}-t`}>Receba o Caderno HDL no seu e-mail</h3>
          <p>Um resumo por dia, às 7h. Grátis, cancele quando quiser.</p>
        </div>
        <div className="nl-acao">
          {sucesso ? null : <Campos acao="assinar" form={form} idCampo={idCampo} idMsg={idMsg} rotuloBotao="Assinar" />}
          <Mensagem id={idMsg} estado={form.estado} mensagem={form.mensagem} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={`nl nl-cartao${cancelando ? ' nl-cancelar' : ''}`} aria-labelledby={`${base}-t`}>
      <span className="nl-pixels" aria-hidden="true" />
      <div className="nl-texto">
        <span className="nl-icone" aria-hidden="true"><Mail size={22} /></span>
        <h2 id={`${base}-t`}>{cancelando ? 'Cancelar inscrição' : 'Receba o Caderno HDL no seu e-mail'}</h2>
        <p>
          {cancelando
            ? 'Informe o e-mail da inscrição e enviaremos um link para confirmar o cancelamento.'
            : 'Um resumo por dia, às 7h, com as notícias de tecnologia que importam. Grátis, sem spam, cancele quando quiser.'}
        </p>
      </div>
      <div className="nl-acao">
        {sucesso ? null : (
          <Campos
            acao={acao}
            form={form}
            idCampo={idCampo}
            idMsg={idMsg}
            rotuloBotao={cancelando ? 'Cancelar inscrição' : 'Assinar'}
          />
        )}
        <Mensagem id={idMsg} estado={form.estado} mensagem={form.mensagem} />
        <p className="nl-lgpd">Usamos seu e-mail só para enviar o resumo. Você pode cancelar a qualquer momento.</p>
      </div>
    </aside>
  );
}

const BANNERS = {
  confirmada: { tipo: 'ok', texto: 'Inscrição confirmada! A partir de amanhã, você recebe o resumo do Caderno HDL às 7h.' },
  cancelada: { tipo: 'ok', texto: 'Inscrição cancelada. Você não receberá mais o resumo diário.' },
  expirada: { tipo: 'aviso', texto: 'Este link expirou. Peça um novo e-mail de confirmação abaixo.' },
  erro: { tipo: 'aviso', texto: 'Não foi possível validar o link. Tente assinar novamente.' },
};

/** Lê ?newsletter=... uma vez, limpa a URL e mostra banner (e formulário de cancelamento). */
export function RetornoNewsletter() {
  const [param] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('newsletter'); } catch { return null; }
  });
  const [aberto, setAberto] = useState(Boolean(param));
  const valido = param === 'cancelar' || Boolean(BANNERS[param]);

  useEffect(() => {
    if (!param) return;
    const p = new URLSearchParams(window.location.search);
    p.delete('newsletter');
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [param]);

  if (!param || !valido || !aberto) return null;

  if (param === 'cancelar') {
    return (
      <div className="nl-retorno">
        <Newsletter acao="cancelar" />
      </div>
    );
  }

  const b = BANNERS[param];
  return (
    <div className="nl-retorno">
      <div className={`nl-banner nl-banner-${b.tipo}`} role="status">
        {b.tipo === 'ok' ? <CheckCircle2 size={20} aria-hidden="true" /> : <Info size={20} aria-hidden="true" />}
        <p>{b.texto}</p>
        <button type="button" className="nl-fechar" aria-label="Fechar aviso" onClick={() => setAberto(false)}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
