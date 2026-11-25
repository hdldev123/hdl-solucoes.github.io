import test from 'node:test';
import assert from 'node:assert/strict';
import { moderarComentario } from './moderacao.js';

const ok = (texto, extra = {}) =>
  moderarComentario({ nome: 'Ana', texto, site: '', tempo: 10000, ...extra });

test('aceita comentário normal e limpa espaços', () => {
  const r = ok('  Ótima   matéria,\u0007 obrigado!  ');
  assert.equal(r.ok, true);
  assert.equal(r.texto, 'Ótima matéria, obrigado!');
  assert.equal(r.nome, 'Ana');
});

test('falso positivo: "computador", "disputa" e "Escute" passam', () => {
  assert.equal(ok('Meu computador roda isso bem na disputa de preços').ok, true);
  assert.equal(ok('Escute o podcast sobre software').ok, true);
});

test('honeypot preenchido é rejeitado', () => {
  assert.equal(ok('Comentário legal', { site: 'x' }).ok, false);
});

test('tempo menor que 3s é rejeitado', () => {
  const r = ok('Comentário legal', { tempo: 2999 });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'Calma! Leia a notícia antes de comentar.');
  assert.equal(ok('Comentário legal', { tempo: undefined }).ok, false);
});

test('limites de tamanho', () => {
  assert.equal(moderarComentario({ nome: 'A', texto: 'oi tudo bem', site: '', tempo: 5000 }).ok, false);
  assert.equal(ok('oi').ok, false);
  assert.equal(ok('a b '.repeat(300)).ok, false);
  assert.equal(moderarComentario({ nome: 'N'.repeat(41), texto: 'texto ok', site: '', tempo: 5000 }).ok, false);
});

test('bloqueia links, domínios e e-mails', () => {
  for (const t of [
    'veja https://exemplo.com/x',
    'acesse www.site',
    'olhem exemplo.com agora',
    'loja.com.br tem promoção',
    'me escreva em fulano@gmail.com',
    'siga @perfil',
  ]) {
    assert.equal(ok(t).ok, false, t);
  }
});

test('bloqueia palavrões com acento, leet e letras repetidas', () => {
  for (const t of ['que merda de notícia', 'Isso é uma M3RD4', 'puuuuta que pariu', 'você é um idiota', 'seus babacas']) {
    assert.equal(ok(t).ok, false, t);
  }
  assert.equal(moderarComentario({ nome: 'Seu Babaca', texto: 'texto normal', site: '', tempo: 5000 }).ok, false);
});

test('repetição de caractere e caixa alta', () => {
  assert.equal(ok('aaaaaaaaa muito bom').ok, false); // 9
  assert.equal(ok('aaaaaaaa muito bom').ok, true); // 8
  assert.equal(ok('ISSO É ABSURDO DEMAIS PARA MIM').ok, false);
  assert.equal(ok('SIM').ok, true); // poucas letras
});

test('limita a 6 quebras de linha', () => {
  const r = ok('a1\n\n\n\n\nb2\nc3\nd4\ne5\nf6\ng7\nh8\ni9');
  assert.equal(r.ok, true);
  assert.ok((r.texto.match(/\n/g) || []).length <= 6);
});
