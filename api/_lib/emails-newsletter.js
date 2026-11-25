// E-mails transacionais da newsletter (HTML simples, estilos inline).
const MARINHO = '#111926';
const AMBAR = '#F9BC20';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function montar({ titulo, intro, botao, link, assunto }) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:${MARINHO};padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Caderno <span style="color:${AMBAR};">HDL</span></td></tr>
<tr><td style="padding:28px;color:${MARINHO};font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 12px;font-size:22px;color:${MARINHO};">${esc(titulo)}</h1>
<p style="margin:0 0 24px;">${esc(intro)}</p>
<p style="margin:0 0 24px;"><a href="${esc(link)}" style="display:inline-block;background:${AMBAR};color:${MARINHO};text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:6px;">${esc(botao)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#4b5563;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${esc(link)}" style="color:${MARINHO};word-break:break-all;">${esc(link)}</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#4b5563;">Este link vale por 48 horas. Se não foi você, ignore este e-mail.</p>
</td></tr></table></td></tr></table></body></html>`;
  const texto = `${titulo}\n\n${intro}\n\n${botao}: ${link}\n\nEste link vale por 48 horas. Se não foi você, ignore este e-mail.\n`;
  return { assunto, html, texto };
}

export function emailConfirmarInscricao({ link }) {
  return montar({
    assunto: 'Confirme sua inscrição no Caderno HDL',
    titulo: 'Confirme sua inscrição',
    intro: 'Recebemos um pedido para enviar o resumo diário do Caderno HDL para este e-mail. Confirme para começar a receber.',
    botao: 'Confirmar inscrição',
    link,
  });
}

export function emailConfirmarCancelamento({ link }) {
  return montar({
    assunto: 'Confirme o cancelamento do Caderno HDL',
    titulo: 'Confirme o cancelamento',
    intro: 'Recebemos um pedido para cancelar o resumo diário do Caderno HDL neste e-mail. Confirme para parar de receber.',
    botao: 'Confirmar cancelamento',
    link,
  });
}
