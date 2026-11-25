/* Grade da coleta (GitHub Actions): minuto 7 das horas UTC abaixo
   = 22h, 06h, 10h, 14h e 18h em Brasília. Módulo puro (sem JSX/import.meta). */

export const HORAS_UTC_COLETA = [1, 9, 13, 17, 21];
export const MINUTO_COLETA = 7;

/** Próximo horário da grade, estritamente após `agora`. Retorna Date. */
export function proximaRodada(agora = new Date()) {
  const base = new Date(agora);
  for (let dia = 0; dia <= 1; dia += 1) {
    for (const hora of HORAS_UTC_COLETA) {
      const t = Date.UTC(
        base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + dia, hora, MINUTO_COLETA, 0, 0,
      );
      if (t > base.getTime()) return new Date(t);
    }
  }
  /* inalcançável: o dia seguinte sempre tem uma rodada */
  return new Date(base.getTime() + 4 * 3600 * 1000);
}

/** Usa `iso` se estiver no futuro; senão calcula pela grade. Retorna Date. */
export function proximaAtualizacaoEfetiva(iso, agora = new Date()) {
  const t = Date.parse(iso);
  if (!Number.isNaN(t) && t > agora.getTime()) return new Date(t);
  return proximaRodada(agora);
}

const fmtHoraBrt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
});
const fmtDiaBrt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** "por volta das 14h07" ou "amanhã por volta das 06h07" (Brasília). */
export function rotuloProximaAtualizacao(iso, agora = new Date()) {
  const alvo = proximaAtualizacaoEfetiva(iso, agora);
  const [h, m] = fmtHoraBrt.format(alvo).split(':');
  const hora = `${h}h${m}`;
  const amanha = fmtDiaBrt.format(alvo) !== fmtDiaBrt.format(agora);
  return amanha ? `amanhã por volta das ${hora}` : `por volta das ${hora}`;
}
