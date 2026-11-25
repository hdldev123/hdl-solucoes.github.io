import test from 'node:test';
import assert from 'node:assert/strict';
import { moderarComentario, contemPalavrao } from './moderacao.js';

const ok = (texto, extra = {}) =>
  moderarComentario({ nome: 'Ana', texto, site: '', tempo: 10000, ...extra });

test('brechas antigas agora bloqueadas', () => {
  for (const t of ['p o r r a', 'p.o.r.r.a', 'pu-ta', 'tnc', 'krl', 'crlh', 'fudido', 'porrada de notícia',
    'c-a-r-a-l-h-o', 'f*d*', 'p*rra', 'c*ralho', 'f u', 'f.d.p', 'fodástico', 'foda', 'fodase', 'vai se f',
    'vai tomar no', 'filho da puta', 'puta que pariu', 'seu retardado', 'F U C K', 'sh*t', 'a$$hole']) {
    assert.equal(contemPalavrao(t).bloqueado, true, t);
    assert.equal(ok(t + ' mesmo').ok, false, t);
  }
});

test('palavras legítimas passam', () => {
  for (const t of ['computador', 'cachorro', 'disputa', 'deputado', 'reputação', 'computação', 'amputação',
    'imputar', 'Cuba', 'cumprir', 'documento', 'acúmulo', 'escuta', 'secular', 'rolamento', 'bichano', 'pausa',
    'Pernambuco', 'Vaticano', 'caramba', 'putz', 'droga', 'nossa', 'vdd', 'porrete', 'bostezo', 'Boston',
    'viaduto', 'boost', 'food', 'putativo', 'cacetete', 'o lançamento foi retardado', 'Kung fu', 'macaco',
    'rola', 'pinto', 'Putin', 'shiitake', 'cuscuz', 'cultura', 'curso', 'cubo', 'cuidado']) {
    assert.equal(contemPalavrao(t).bloqueado, false, t);
  }
});

test('frases longas sobre tecnologia não são bloqueadas', () => {
  for (const t of [
    'A Nvidia lançou a RTX 5090 com 32 GB de memória GDDR7 e desempenho 30% maior, preço US$ 1.999!',
    'Intel Core i9 14900K a 5.8 GHz, 24 núcleos (8P+16E) e 125 W de TDP; o chip é 15% mais rápido.',
    'Eu e o cara fomos a um evento de IA em SP e não vi nada de novo, é só hype.',
    'O computador quântico da IBM promete reduzir o consumo de energia dos data centers em 40%.',
    'Concordo em parte: a reputação da empresa caiu depois da disputa judicial sobre as patentes.',
    'O deputado citou o documento sobre a regulação da inteligência artificial no Congresso.',
    'Pausa nas vendas do Vision Pro? A Apple deve cumprir o cronograma de 2027 e lançar o modelo barato.',
    'Esse smartphone com Snapdragon 8 Gen 5 e 16 GB de RAM roda tudo no máximo, mas a bateria de 5000 mAh dura pouco.',
    'Meu cachorro derrubou o roteador Wi-Fi 7 e a conexão de 1 Gbps ficou instável no escritório.',
    'Quem estuda a Segunda Guerra sabe que o nazismo foi derrotado em 1945.',
  ]) {
    assert.equal(contemPalavrao(t).bloqueado, false, t);
    assert.equal(ok(t).ok, true, t);
  }
});

test('bateria: ~40 palavrões com variantes automáticas', () => {
  const termos = ['porra', 'caralho', 'puta', 'merda', 'foda', 'fodase', 'buceta', 'cacete', 'bosta', 'fdp',
    'pqp', 'vsf', 'tnc', 'krl', 'crl', 'cuzao', 'punheta', 'arrombado', 'viado', 'otario', 'babaca', 'idiota',
    'imbecil', 'escroto', 'vagabundo', 'xoxota', 'piroca', 'fuck', 'shit', 'bitch', 'asshole', 'desgracado',
    'fudido', 'siririca', 'boiola', 'vadia', 'corno', 'kralho', 'vtnc', 'cu'];
  const leet = (s) => s.replace(/a/g, '4').replace(/e/g, '3').replace(/i/g, '1').replace(/o/g, '0').replace(/s/g, '5');
  for (const t of termos) {
    const variantes = [
      t, t.toUpperCase(), leet(t), t + t.at(-1).repeat(4), t[0] + t[0] + t.slice(1),
      [...t].join(' '), [...t].join('.'), [...t].join('-'), [...t].join('_'), [...t].join('*'),
      `isso é ${t} mesmo`, `${t}!`, `"${t.toUpperCase()}"`,
    ];
    if (t.length >= 3) variantes.push(t[0] + '*' + t.slice(2));
    if (t.length >= 4) variantes.push(t[0] + t[1] + '́' + t.slice(2));
    for (const v of variantes) assert.equal(contemPalavrao(v).bloqueado, true, `${t} -> ${v}`);
  }
});

test('mensagens de erro e termo', () => {
  assert.equal(ok('isso é uma porra').erro, 'Seu comentário contém linguagem ofensiva. Reescreva sem palavrões.');
  const r = moderarComentario({ nome: 'Seu Babaca', texto: 'texto normal', site: '', tempo: 5000 });
  assert.equal(r.erro, 'Escolha outro nome.');
  assert.equal(contemPalavrao('porrada').termo, 'porrada');
  assert.deepEqual(contemPalavrao('ótimo texto'), { bloqueado: false });
});

test('caracteres invisíveis e homóglifos não escondem palavrão', () => {
  assert.equal(contemPalavrao('p​o​r​ra').bloqueado, true);
  assert.equal(contemPalavrao('ｐｏｒｒａ').bloqueado, true);
  assert.equal(contemPalavrao('pоrra').bloqueado, true); // "о" cirílico
});

test('números grudados e decoração com x nas pontas não escondem palavrões', () => {
  for (const t of ['fdp123', '123fdp', 'Fdp2024', 'pqp99', 'vsf_01', 'xXputaXx', 'xxcaralhoxx', 'XporraX']) {
    assert.equal(contemPalavrao(t).bloqueado, true, t);
  }
  const nome = moderarComentario({ nome: 'Fdp123', texto: 'bom texto', site: '', tempo: 5000 });
  assert.equal(nome.ok, false);
  for (const t of ['Ana123', 'Bruno2024', 'iPhone15', 'Windows11', 'Xbox', 'xadrez', 'Linux', 'Max', 'Alex', 'Xuxa', 'GPT5 é bom', 'RTX4090']) {
    assert.equal(contemPalavrao(t).bloqueado, false, t);
  }
});
