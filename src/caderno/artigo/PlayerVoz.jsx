import { useEffect } from 'react';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { VELOCIDADES } from './useLeitorVoz.js';

export default function PlayerVoz({ leitor }) {
  const {
    estado, indice, total, itemAtual, velocidade, vozes, vozUri,
    tocar, pausar, parar, anterior, proximo, alterarVelocidade, alterarVoz,
  } = leitor;

  const ativo = estado !== 'parado';
  const idAtual = itemAtual?.id;

  // destaque visual + scroll suave até o trecho lido
  useEffect(() => {
    if (!idAtual) return undefined;
    const el = document.getElementById(idAtual);
    if (!el) return undefined;
    el.classList.add('lendo');
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = el.getBoundingClientRect();
    const dentro = r.top > 120 && r.bottom < window.innerHeight - 200;
    if (!dentro) el.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
    return () => el.classList.remove('lendo');
  }, [idAtual]);

  useEffect(() => {
    if (!ativo) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') parar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ativo, parar]);

  const status = estado === 'falando'
    ? `Lendo parágrafo ${indice + 1} de ${total}`
    : estado === 'pausado'
      ? `Leitura pausada no parágrafo ${indice + 1} de ${total}`
      : 'Leitura parada';

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {ativo ? (
        <section className="player-voz" aria-label="Leitura em voz alta">
          <div className="player-info">
            <strong>{estado === 'pausado' ? 'Pausado' : 'Ouvindo'}</strong>
            <span className="player-progresso">{indice + 1} de {total}</span>
            <div
              className="player-barra"
              role="progressbar"
              aria-label="Progresso da leitura"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={indice + 1}
            >
              <i style={{ transform: `scaleX(${(indice + 1) / Math.max(total, 1)})` }} />
            </div>
          </div>

          <div className="player-controles">
            <button type="button" className="player-btn" onClick={anterior} disabled={indice === 0} aria-label="Parágrafo anterior">
              <SkipBack size={18} aria-hidden="true" />
            </button>
            {estado === 'falando' ? (
              <button type="button" className="player-btn player-btn-principal" onClick={pausar} aria-label="Pausar leitura">
                <Pause size={20} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="player-btn player-btn-principal" onClick={tocar} aria-label="Retomar leitura">
                <Play size={20} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="player-btn" onClick={proximo} disabled={indice >= total - 1} aria-label="Próximo parágrafo">
              <SkipForward size={18} aria-hidden="true" />
            </button>
            <button type="button" className="player-btn" onClick={parar} aria-label="Parar leitura">
              <Square size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="player-opcoes">
            <label>
              <span className="sr-only">Velocidade</span>
              <select value={velocidade} onChange={(e) => alterarVelocidade(Number(e.target.value))} aria-label="Velocidade de leitura">
                {VELOCIDADES.map((v) => <option key={v} value={v}>{String(v).replace('.', ',')}x</option>)}
              </select>
            </label>
            {vozes.length > 1 ? (
              <label>
                <span className="sr-only">Voz</span>
                <select value={vozUri} onChange={(e) => alterarVoz(e.target.value)} aria-label="Voz">
                  {vozes.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
