// Agendador do Caderno HDL (Vercel Schedules → GitHub Actions).
//
// O cron nativo do GitHub Actions não é confiável (pode atrasar ou descartar execuções, e em
// 25-26/11/2026 não disparou nenhuma). Por isso o relógio fica na Vercel: os "schedules" do
// vercel.json invocam esta função privada (trigger schedule/v1beta, sem URL pública), e ela
// dispara o workflow correspondente via API (workflow_dispatch).
//
// Variáveis de ambiente (Vercel):
//   GITHUB_DISPATCH_TOKEN  token fine-grained com "Actions: Read and write" neste repositório
//   GITHUB_REPO            opcional, padrão hdldev123/hdl-solucoes.github.io
import { handleSchedule } from '@vercel/schedules';

const REPO_PADRAO = 'hdldev123/hdl-solucoes.github.io';
const TIMEOUT_MS = 15000;
// Depois de uma indisponibilidade a Vercel entrega todas as ocorrências pendentes; uma rodada
// com mais de 2h de atraso já foi substituída pela seguinte e é descartada.
export const ATRASO_MAX_MS = 2 * 3600 * 1000;

// Nome do schedule no vercel.json → workflow a disparar.
export const AGENDAMENTOS = {
  'caderno-coleta': { workflow: 'caderno-hdl.yml', inputs: { agendado: 'true' } },
  'caderno-newsletter': { workflow: 'caderno-newsletter.yml', inputs: {} },
};

export async function dispararWorkflow(nome, { env = process.env, fetchFn = fetch } = {}) {
  const alvo = AGENDAMENTOS[nome];
  if (!alvo) throw new Error(`Agendamento desconhecido: ${nome}`);
  const token = env.GITHUB_DISPATCH_TOKEN;
  if (!token) throw new Error('GITHUB_DISPATCH_TOKEN ausente: configure o token na Vercel.');
  const repo = env.GITHUB_REPO || REPO_PADRAO;

  const resp = await fetchFn(`https://api.github.com/repos/${repo}/actions/workflows/${alvo.workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'caderno-hdl-agendador',
    },
    body: JSON.stringify({ ref: 'main', inputs: alvo.inputs }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => '');
    throw new Error(`GitHub respondeu ${resp.status} ao disparar ${alvo.workflow}: ${detalhe.slice(0, 300)}`);
  }
  return { workflow: alvo.workflow };
}

export async function executarAgendamento(metadata, { env = process.env, fetchFn = fetch, agora = new Date() } = {}) {
  const atraso = agora.getTime() - new Date(metadata.scheduledAt).getTime();
  if (Number.isFinite(atraso) && atraso > ATRASO_MAX_MS) {
    console.warn(`[agendador] ${metadata.name} (${metadata.executionId}) descartado: ${Math.round(atraso / 60000)} min de atraso.`);
    return { disparado: false };
  }
  const { workflow } = await dispararWorkflow(metadata.name, { env, fetchFn });
  console.log(`[agendador] ${metadata.name} (${metadata.executionId}) → ${workflow} disparado.`);
  return { disparado: true, workflow };
}

export const POST = handleSchedule(async (metadata) => {
  await executarAgendamento(metadata);
});
