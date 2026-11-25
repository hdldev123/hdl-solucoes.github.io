import test from 'node:test';
import assert from 'node:assert/strict';
import { proximaRodada, rotuloProximaAtualizacao } from './agenda.js';

const iso = (s) => proximaRodada(new Date(s)).toISOString();

test('proximaRodada dentro do dia', () => {
  assert.equal(iso('2026-11-25T10:00:00Z'), '2026-11-25T13:07:00.000Z');
  assert.equal(iso('2026-11-25T00:00:00Z'), '2026-11-25T01:07:00.000Z');
});

test('estritamente após agora', () => {
  assert.equal(iso('2026-11-25T13:07:00Z'), '2026-11-25T17:07:00.000Z');
});

test('virada de dia UTC', () => {
  assert.equal(iso('2026-11-25T21:07:00Z'), '2026-11-26T01:07:00.000Z');
  assert.equal(iso('2026-12-31T22:00:00Z'), '2027-01-01T01:07:00.000Z');
});

test('rótulo em Brasília, hoje e amanhã', () => {
  // 15:00 UTC = 12h BRT -> próxima 17:07Z = 14h07
  assert.equal(rotuloProximaAtualizacao(null, new Date('2026-11-25T15:00:00Z')), 'por volta das 14h07');
  // 19:00 BRT -> próxima 01:07Z (22h07 do mesmo dia BRT)
  assert.equal(rotuloProximaAtualizacao(null, new Date('2026-11-25T22:00:00Z')), 'por volta das 22h07');
  // 22:30 BRT (01:30Z) -> próxima 09:07Z = 06h07 do dia seguinte
  assert.equal(rotuloProximaAtualizacao('2020-01-01T00:00:00Z', new Date('2026-11-26T01:30:00Z')), 'amanhã por volta das 06h07');
});

test('usa o índice só se futuro', () => {
  const agora = new Date('2026-11-25T15:00:00Z');
  assert.equal(rotuloProximaAtualizacao('2026-11-25T21:07:00Z', agora), 'por volta das 18h07');
});
