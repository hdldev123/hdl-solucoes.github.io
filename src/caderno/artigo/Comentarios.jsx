import { forwardRef, useEffect, useRef, useState } from 'react';
import { Flag, Loader2, Send } from 'lucide-react';
import { comentar, denunciar, gravarPreferencia, jaDenunciou, lerPreferencia, marcarDenuncia } from '../api.js';
import { dataRelativa } from '../dados.js';

const LIMITE = 1000;
const CHAVE_NOME = 'hdl-caderno-nome';

function Comentario({ slug, item }) {
  const [denunciado, setDenunciado] = useState(() => jaDenunciou(item.id));
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    const r = await denunciar(slug, item.id);
    setEnviando(false);
    setConfirmando(false);
    if (r.ok) {
      marcarDenuncia(item.id);
      setDenunciado(true);
      setMsg('Obrigado. Sua denúncia foi registrada.');
    } else {
      setMsg(r.erro);
    }
  };

  return (
    <li className="comentario">
      <div className="comentario-topo">
        <strong>{item.nome}</strong>
        <time dateTime={item.criadoEm}>{dataRelativa(item.criadoEm)}</time>
      </div>
      <p className="comentario-texto">{item.texto}</p>
      <div className="comentario-acoes">
        {denunciado ? (
          <span className="comentario-denunciado">Denunciado</span>
        ) : confirmando ? (
          <span className="comentario-confirma">
            Denunciar este comentário?
            <button type="button" onClick={confirmar} disabled={enviando}>{enviando ? 'Enviando…' : 'Sim, denunciar'}</button>
            <button type="button" onClick={() => setConfirmando(false)}>Cancelar</button>
          </span>
        ) : (
          <button type="button" className="comentario-denunciar" onClick={() => { setMsg(''); setConfirmando(true); }}>
            <Flag size={13} aria-hidden="true" /> Denunciar
          </button>
        )}
        {msg ? <span className="comentario-msg" role="status">{msg}</span> : null}
      </div>
    </li>
  );
}

const Comentarios = forwardRef(function Comentarios({ slug, estado, comentarios, aoNovo }, ref) {
  const [nome, setNome] = useState(() => lerPreferencia(CHAVE_NOME) || '');
  const [texto, setTexto] = useState('');
  const [site, setSite] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const montadoEm = useRef(Date.now());
  const campoTexto = useRef(null);
  const campoNome = useRef(null);

  useEffect(() => { montadoEm.current = Date.now(); }, [slug]);

  const enviar = async (e) => {
    e.preventDefault();
    setOk('');
    const n = nome.trim();
    const t = texto.trim();
    if (!n) { setErro('Informe seu nome.'); campoNome.current?.focus(); return; }
    if (!t) { setErro('Escreva seu comentário.'); campoTexto.current?.focus(); return; }
    if (t.length > LIMITE) { setErro(`O comentário pode ter no máximo ${LIMITE} caracteres.`); campoTexto.current?.focus(); return; }

    setErro('');
    setEnviando(true);
    const r = await comentar({ slug, nome: n, texto: t, site, tempo: Date.now() - montadoEm.current });
    setEnviando(false);

    if (r.ok && r.dados?.comentario) {
      gravarPreferencia(CHAVE_NOME, n);
      aoNovo(r.dados.comentario);
      setTexto('');
      setOk('Comentário publicado. Obrigado por participar!');
      montadoEm.current = Date.now();
    } else {
      setErro(r.erro || 'Não foi possível enviar o comentário.');
    }
  };

  const restante = LIMITE - texto.length;

  return (
    <section className="comentarios" id="comentarios" ref={ref} aria-labelledby="comentarios-titulo" tabIndex={-1}>
      <h2 id="comentarios-titulo">
        Comentários{estado === 'ok' ? <span className="comentarios-qtd"> ({comentarios.length})</span> : null}
      </h2>

      {estado === 'indisponivel' ? (
        <p className="comentarios-aviso" role="status">Comentários indisponíveis no momento.</p>
      ) : (
        <>
          <form className="comentario-form" onSubmit={enviar} noValidate>
            <div className="campo">
              <label htmlFor="comentario-nome">Nome</label>
              <input
                id="comentario-nome"
                ref={campoNome}
                name="nome"
                type="text"
                autoComplete="nickname"
                maxLength={60}
                placeholder="Como quer ser identificado…"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="comentario-texto">Comentário</label>
              <textarea
                id="comentario-texto"
                ref={campoTexto}
                name="comentario"
                rows={4}
                autoComplete="off"
                placeholder="Compartilhe sua opinião de forma respeitosa…"
                value={texto}
                aria-describedby="comentario-contador"
                onChange={(ev) => setTexto(ev.target.value)}
                onKeyDown={(ev) => {
                  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') enviar(ev);
                }}
              />
              <span id="comentario-contador" className={`contador${restante < 0 ? ' contador-excedeu' : ''}`}>
                {texto.length}/{LIMITE}
              </span>
            </div>

            {/* honeypot: invisível para humanos e leitores de tela */}
            <div className="campo-isca" aria-hidden="true">
              <label htmlFor="comentario-site">Site</label>
              <input
                id="comentario-site"
                name="site"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={site}
                onChange={(ev) => setSite(ev.target.value)}
              />
            </div>

            <div className="comentario-form-rodape">
              <button type="submit" className="botao-caderno botao-caderno-primario" disabled={enviando}>
                {enviando ? <Loader2 className="girar" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                {enviando ? 'Enviando…' : 'Publicar comentário'}
              </button>
              <p className="comentario-nota">Comentários são públicos e moderados automaticamente.</p>
            </div>

            <div aria-live="polite">
              {erro ? <p className="form-erro" role="alert">{erro}</p> : null}
              {ok ? <p className="form-ok">{ok}</p> : null}
            </div>
          </form>

          {estado === 'carregando' ? (
            <p className="comentarios-aviso" role="status">Carregando comentários…</p>
          ) : comentarios.length === 0 ? (
            <p className="comentarios-aviso">Ainda não há comentários. Seja a primeira pessoa a comentar.</p>
          ) : (
            <ul className="comentarios-lista">
              {comentarios.map((c) => <Comentario key={c.id} slug={slug} item={c} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
});

export default Comentarios;
