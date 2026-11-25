import { dataHoraAbsoluta, rotuloCategoria, urlCanonica } from '../dados.js';

export const AVISO_IA = 'Texto produzido com IA a partir das fontes citadas.';

export function montarTxt(post) {
  const url = urlCanonica(post.slug);
  const linhas = [post.titulo, '='.repeat(Math.min(post.titulo.length, 72)), '', post.subtitulo, ''];
  linhas.push(`${rotuloCategoria(post.categoria)} · ${dataHoraAbsoluta(post.publicadoEm)} · ${post.tempoLeitura} min de leitura`, '');

  if (post.pontosChave?.length) {
    linhas.push('PONTOS-CHAVE');
    post.pontosChave.forEach((p) => linhas.push(`- ${p}`));
    linhas.push('');
  }

  (post.secoes || []).forEach((secao) => {
    if (secao.titulo) linhas.push(secao.titulo.toUpperCase(), '');
    (secao.paragrafos || []).forEach((p) => linhas.push(p, ''));
  });

  if (post.porQueImporta) linhas.push('POR QUE IMPORTA', '', post.porQueImporta, '');

  if (post.fontes?.length) {
    linhas.push('FONTES');
    post.fontes.forEach((f) => {
      linhas.push(`- ${f.nome}: ${f.titulo || ''}`.trimEnd(), `  ${f.url}`);
    });
    linhas.push('');
  }

  linhas.push(`Artigo: ${url}`, AVISO_IA, `Caderno HDL — ${url}`);
  return linhas.join('\n');
}

export function montarMarkdown(post) {
  const url = urlCanonica(post.slug);
  const linhas = [`# ${post.titulo}`, '', `_${post.subtitulo}_`, ''];
  linhas.push(`**${rotuloCategoria(post.categoria)}** · ${dataHoraAbsoluta(post.publicadoEm)} · ${post.tempoLeitura} min de leitura`, '');

  if (post.pontosChave?.length) {
    linhas.push('## Pontos-chave', '');
    post.pontosChave.forEach((p) => linhas.push(`- ${p}`));
    linhas.push('');
  }

  (post.secoes || []).forEach((secao) => {
    if (secao.titulo) linhas.push(`## ${secao.titulo}`, '');
    (secao.paragrafos || []).forEach((p) => linhas.push(p, ''));
  });

  if (post.porQueImporta) linhas.push('## Por que importa', '', post.porQueImporta, '');

  if (post.fontes?.length) {
    linhas.push('## Fontes', '');
    post.fontes.forEach((f) => {
      linhas.push(`- [${f.nome}${f.titulo ? ` — ${f.titulo}` : ''}](${f.url})`);
    });
    linhas.push('');
  }

  linhas.push('---', '', `Artigo original: <${url}>`, '', `_${AVISO_IA}_`);
  return linhas.join('\n');
}

export function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
