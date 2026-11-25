// Monta o HTML (e assunto/preview) do resumo diário do Caderno HDL.
// E-mail robusto: tabelas, estilos inline, 600px, sem JS, sem imagens obrigatórias.

export const ROTULOS = {
  ia: 'Inteligência Artificial',
  seguranca: 'Segurança',
  desenvolvimento: 'Desenvolvimento',
  nuvem: 'Nuvem & Infra',
  hardware: 'Hardware',
  mobile: 'Mobile',
  negocios: 'Negócios & Startups',
  ciencia: 'Ciência & Espaço',
};

const MARINHO = '#111926';
const AMBAR = '#F9BC20';
const FUNDO = '#F7F7F4';
const TITULO = "'Sora','Segoe UI',Arial,sans-serif";
const TEXTO = "'Inter','Segoe UI',Arial,sans-serif";
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=resumo-diario';

export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** Data em BRT (UTC-3, sem horário de verão). */
export function partesBRT(data) {
  const d = new Date(data.getTime() - 3 * 3600 * 1000);
  return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear(), semana: d.getUTCDay() };
}

export function dataPorExtenso(data) {
  const p = partesBRT(data);
  return `${DIAS[p.semana]}, ${p.dia} de ${MESES[p.mes - 1]} de ${p.ano}`;
}

function url(site, caminho) {
  const sep = caminho.includes('?') ? '&' : '?';
  return `${site}${caminho}${sep}${UTM}`;
}

export function montarAssunto(posts) {
  const extras = posts.length - 1;
  let assunto = `Caderno HDL: ${posts[0].titulo}`;
  if (extras > 0) assunto += ` e mais ${extras} ${extras === 1 ? 'notícia' : 'notícias'}`;
  return assunto;
}

function meta(post) {
  const n = post.fontes?.length || 0;
  const partes = [];
  if (post.tempoLeitura) partes.push(`${post.tempoLeitura} min de leitura`);
  if (n) partes.push(`${n} ${n === 1 ? 'fonte' : 'fontes'}`);
  return partes.join(' · ');
}

function pilula(post) {
  const rotulo = ROTULOS[post.categoria] || post.categoria || 'Tecnologia';
  return `<span class="pilula" style="display:inline-block;background-color:#FFF4D1;color:#5C4300;font-family:${TEXTO};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;line-height:1;padding:6px 10px;border-radius:999px;">${esc(rotulo)}</span>`;
}

function botao(href, texto) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${AMBAR};border-radius:8px;"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${TEXTO};font-size:14px;font-weight:700;color:${MARINHO};text-decoration:none;border-radius:8px;">${esc(texto)}</a></td></tr></table>`;
}

function cartaoDestaque(post, site) {
  const href = url(site, `/caderno/${post.slug}/`);
  return `<tr><td style="padding:0 0 20px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="cartao" style="background-color:#FFFFFF;border:1px solid #E7E5DD;border-radius:14px;">
<tr><td style="height:6px;line-height:6px;font-size:0;background-color:${AMBAR};border-radius:14px 14px 0 0;">&nbsp;</td></tr>
<tr><td style="padding:26px 28px 28px 28px;">
<p class="suave" style="margin:0 0 14px 0;font-family:${TEXTO};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A6500;">Destaque do dia</p>
<p style="margin:0 0 16px 0;">${pilula(post)}</p>
<h2 class="txt-forte" style="margin:0 0 12px 0;font-family:${TITULO};font-size:25px;line-height:1.25;font-weight:700;color:${MARINHO};"><a href="${esc(href)}" class="txt-forte" style="color:${MARINHO};text-decoration:none;">${esc(post.titulo)}</a></h2>
<p class="txt" style="margin:0 0 18px 0;font-family:${TEXTO};font-size:16px;line-height:1.6;color:#3A4352;">${esc(post.resumo || post.subtitulo)}</p>
<p class="suave" style="margin:0 0 20px 0;font-family:${TEXTO};font-size:13px;color:#6B7280;">${esc(meta(post))}</p>
${botao(href, 'Ler notícia completa')}
</td></tr></table></td></tr>`;
}

function cartaoComum(post, site) {
  const href = url(site, `/caderno/${post.slug}/`);
  return `<tr><td style="padding:0 0 14px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="cartao" style="background-color:#FFFFFF;border:1px solid #E7E5DD;border-radius:12px;">
<tr><td style="padding:20px 24px 22px 24px;">
<p style="margin:0 0 12px 0;">${pilula(post)}</p>
<h3 class="txt-forte" style="margin:0 0 8px 0;font-family:${TITULO};font-size:18px;line-height:1.35;font-weight:700;color:${MARINHO};"><a href="${esc(href)}" class="txt-forte" style="color:${MARINHO};text-decoration:none;">${esc(post.titulo)}</a></h3>
<p class="txt" style="margin:0 0 12px 0;font-family:${TEXTO};font-size:14px;line-height:1.6;color:#3A4352;">${esc(post.resumo || post.subtitulo)}</p>
<p class="suave" style="margin:0;font-family:${TEXTO};font-size:13px;color:#6B7280;">${esc(meta(post))} &nbsp;·&nbsp; <a href="${esc(href)}" class="link" style="color:#8A5A00;font-weight:700;text-decoration:underline;">Ler notícia completa &rarr;</a></p>
</td></tr></table></td></tr>`;
}

export function montarEmailResumo({ posts, site, data }) {
  if (!posts?.length) throw new Error('montarEmailResumo exige ao menos um post.');
  const base = String(site).replace(/\/+$/, '');
  const assunto = montarAssunto(posts);
  const previewText = String(posts[0].resumo || posts[0].subtitulo || '').slice(0, 150);
  const quando = dataPorExtenso(data);
  const n = posts.length;
  const intro = n === 1 ? 'A notícia de tecnologia que importa hoje.' : `As ${n} notícias de tecnologia que importam hoje.`;
  const cartoes = posts.map((p, i) => (i === 0 ? cartaoDestaque(p, base) : cartaoComum(p, base))).join('\n');
  const todas = url(base, '/caderno/');
  const cancelarSite = `${base}/caderno/?newsletter=cancelar`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(assunto)}</title>
<style>
@media (max-width:620px){.container{width:100%!important}.pad{padding-left:16px!important;padding-right:16px!important}}
@media (prefers-color-scheme:dark){
body,.fundo{background-color:#0B1018!important}
.cartao{background-color:#182130!important;border-color:#2A3446!important}
.txt{color:#C9D1DE!important}
.txt-forte,.txt-forte a{color:#FFFFFF!important}
.suave{color:#98A2B3!important}
.link{color:#F9BC20!important}
.pilula{background-color:#3A2F0E!important;color:#F9D870!important}
}
</style>
</head>
<body class="fundo" style="margin:0;padding:0;background-color:${FUNDO};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${FUNDO};">${esc(previewText)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="fundo" style="background-color:${FUNDO};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px;max-width:100%;">
<tr><td class="pad" style="background-color:${MARINHO};border-radius:14px;border-top:4px solid ${AMBAR};padding:28px 32px 26px 32px;">
<p style="margin:0 0 6px 0;font-family:${TITULO};font-size:26px;line-height:1.1;font-weight:800;color:#FFFFFF;">Caderno <span style="color:${AMBAR};">HDL</span></p>
<p style="margin:0 0 14px 0;font-family:${TEXTO};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9AA6B8;">Resumo diário de tecnologia</p>
<p style="margin:0;font-family:${TEXTO};font-size:14px;color:#E5E9F0;">${esc(quando)}</p>
</td></tr>
<tr><td style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:0 4px 16px 4px;"><p class="txt" style="margin:0;font-family:${TEXTO};font-size:15px;line-height:1.5;color:#3A4352;">${esc(intro)}</p></td></tr>
${cartoes}
<tr><td align="center" style="padding:10px 0 26px 0;">
<a href="${esc(todas)}" class="link" style="font-family:${TEXTO};font-size:14px;font-weight:700;color:#8A5A00;text-decoration:underline;">Ver todas as notícias &rarr;</a>
</td></tr>
<tr><td class="pad" style="border-top:1px solid #E1DFD6;padding:22px 8px 8px 8px;">
<p class="suave" style="margin:0 0 10px 0;font-family:${TEXTO};font-size:12px;line-height:1.6;color:#6B7280;">Você recebe este e-mail porque assinou o resumo diário do Caderno HDL.</p>
<p class="suave" style="margin:0 0 10px 0;font-family:${TEXTO};font-size:12px;line-height:1.6;color:#6B7280;">Textos produzidos com IA a partir das fontes citadas em cada notícia.</p>
<p class="suave" style="margin:0;font-family:${TEXTO};font-size:12px;line-height:1.6;color:#6B7280;"><a href="{{ unsubscribe }}" class="suave" style="color:#6B7280;text-decoration:underline;">Cancelar inscrição</a> &nbsp;·&nbsp; <a href="${esc(cancelarSite)}" class="suave" style="color:#6B7280;text-decoration:underline;">Cancelar pelo site</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return { assunto, previewText, html };
}
