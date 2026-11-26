import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dispararWorkflow, executarAgendamento, AGENDAMENTOS, ATRASO_MAX_MS } from '../caderno/agendador.js';

const ENV = { GITHUB_DISPATCH_TOKEN: 'ghp_teste' };

function fetchFalso(status = 204, corpo = '') {
  const chamadas = [];
  const fn = async (url, opcoes) => {
    chamadas.push({ url, opcoes, corpo: JSON.parse(opcoes.body) });
    return new Response(status === 204 ? null : corpo, { status });
  };
  return { fn, chamadas };
}

test('agendador: coleta dispara caderno-hdl.yml na main com agendado=true', async () => {
  const { fn, chamadas } = fetchFalso();
  const r = await dispararWorkflow('caderno-coleta', { env: ENV, fetchFn: fn });
  assert.equal(r.workflow, 'caderno-hdl.yml');
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'https://api.github.com/repos/hdldev123/hdl-solucoes.github.io/actions/workflows/caderno-hdl.yml/dispatches');
  assert.equal(chamadas[0].opcoes.method, 'POST');
  assert.equal(chamadas[0].opcoes.headers.Authorization, 'Bearer ghp_teste');
  assert.deepEqual(chamadas[0].corpo, { ref: 'main', inputs: { agendado: 'true' } });
});

test('agendador: newsletter dispara caderno-newsletter.yml sem inputs; GITHUB_REPO sobrescreve o repo', async () => {
  const { fn, chamadas } = fetchFalso(200, '{}');
  await dispararWorkflow('caderno-newsletter', { env: { ...ENV, GITHUB_REPO: 'org/outro' }, fetchFn: fn });
  assert.equal(chamadas[0].url, 'https://api.github.com/repos/org/outro/actions/workflows/caderno-newsletter.yml/dispatches');
  assert.deepEqual(chamadas[0].corpo, { ref: 'main', inputs: {} });
});

test('agendador: erros de configuração e da API viram exceção (500 no histórico da Vercel)', async () => {
  const { fn } = fetchFalso();
  await assert.rejects(dispararWorkflow('desconhecido', { env: ENV, fetchFn: fn }), /Agendamento desconhecido/);
  await assert.rejects(dispararWorkflow('caderno-coleta', { env: {}, fetchFn: fn }), /GITHUB_DISPATCH_TOKEN ausente/);
  const { fn: fn401 } = fetchFalso(401, '{"message":"Bad credentials"}');
  await assert.rejects(dispararWorkflow('caderno-coleta', { env: ENV, fetchFn: fn401 }), /GitHub respondeu 401.*Bad credentials/);
});

test('agendador: ocorrência muito atrasada é descartada; no prazo é disparada', async () => {
  const agora = new Date('2026-11-26T12:00:00Z');
  const { fn, chamadas } = fetchFalso();
  const velha = { name: 'caderno-coleta', executionId: 'e1', scheduledAt: new Date(agora.getTime() - ATRASO_MAX_MS - 60000) };
  assert.deepEqual(await executarAgendamento(velha, { env: ENV, fetchFn: fn, agora }), { disparado: false });
  assert.equal(chamadas.length, 0);
  const noPrazo = { name: 'caderno-coleta', executionId: 'e2', scheduledAt: new Date(agora.getTime() - 15 * 60000) };
  assert.deepEqual(await executarAgendamento(noPrazo, { env: ENV, fetchFn: fn, agora }), { disparado: true, workflow: 'caderno-hdl.yml' });
  assert.equal(chamadas.length, 1);
});

test('agendador: todo schedule do vercel.json aponta para o agendador e tem workflow mapeado', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.functions['api/caderno/agendador.js'].experimentalTriggers, [{ type: 'schedule/v1beta' }]);
  const nomes = Object.keys(config.schedules);
  assert.deepEqual(nomes.sort(), Object.keys(AGENDAMENTOS).sort());
  for (const nome of nomes) {
    assert.equal(config.schedules[nome].function, 'api/caderno/agendador');
    assert.equal(config.schedules[nome].timezone, 'America/Sao_Paulo');
    const wf = readFileSync(new URL(`../../.github/workflows/${AGENDAMENTOS[nome].workflow}`, import.meta.url), 'utf8');
    assert.match(wf, /workflow_dispatch:/);
    for (const input of Object.keys(AGENDAMENTOS[nome].inputs)) assert.match(wf, new RegExp(`\\n\\s+${input}:`));
  }
});
