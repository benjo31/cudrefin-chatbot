     1|import { sb } from './db.js';
     2|import { config } from './config.js';
     3|
     4|const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
     5|const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
     6|const INTENT_RE = /(rappel|recontact|recontacter|contact|devis|rendez[-\\s]?vous|offre|prendre rendez|qu'on me rappelle|qu'on me contacte|m'appel)/i;
     7|
     8|export function detectLeadIntent(userText, assistantText) {
     9|  const t = `${userText}\n${assistantText}`;
    10|  const hasIntent = INTENT_RE.test(t);
    11|  const email = (userText.match(EMAIL_RE) || [])[0] || null;
    12|  const phone = (userText.match(PHONE_RE) || [])[0] || null;
    13|  return { suggestForm: hasIntent || !!email || !!phone, email, phone };
    14|}
    15|
    16|export async function createLead({ botId, conversationId, name, email, phone, message, botName }) {
    17|  const { data, error } = await sb.from('leads').insert({
    18|    bot_id: botId,
    19|    conversation_id: conversationId || null,
    20|    name: name || null,
    21|    email: email || null,
    22|    phone: phone || null,
    23|    message: message || null,
    24|  }).select().maybeSingle();
    25|  if (error) throw error;
    26|
    27|// Envoyer notification email (non bloquant)
    28|  notifyNewLead({ botName, name, email, phone, message }).catch((e) => {
    29|    console.error('[leads] notifyEmail error:', e?.message || e);
    30|  });
    31|
    32|  return data.id;
    33|}
    34|
    35|const ADMIN_URL = 'https://cudrefin-chatbot.onrender.com';
    36|
    37|/**
    38| * Envoie une notification email via Resend.
    39| * Exportée pour être utilisée aussi depuis les routes (conversation, etc.)
    40| */
    41|export async function sendNotification({ botName, type, details }) {
    42|  const apiKey = config.resendApiKey;
    43|  if (!apiKey) return;
    44|
    45|  // Avec onboarding@resend.dev, on ne peut envoyer qu'à benjamin.loth@hotmail.com
    46|  // Une fois cudrefin.ch vérifié sur Resend, communication@cudrefin.ch fonctionnera aussi
    47|  const to = 'benjamin.loth@hotmail.com';
    48|  const bot = botName || 'un chatbot';
    49|
    50|  let subject, html;
    51|  if (type === 'lead') {
    52|    subject = `📩 Nouveau lead - ${bot}`;
    53|    const contactName = details?.name || 'Anonyme';
    54|    const contactEmail = details?.email || 'non renseigné';
    55|    const contactPhone = details?.phone || 'non renseigné';
    56|    const msg = details?.message || 'pas de message';
    57|    html = `
    58|      <h2>Nouveau contact depuis ${bot}</h2>
    59|      <table style="border-collapse:collapse;width:100%;max-width:500px">
    60|        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Nom</td><td style="padding:8px;border:1px solid #ddd">${contactName}</td></tr>
    61|        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${contactEmail}</td></tr>
    62|        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Téléphone</td><td style="padding:8px;border:1px solid #ddd">${contactPhone}</td></tr>
    63|        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${msg}</td></tr>
    64|      </table>
    65|      <p><a href="${ADMIN_URL}">Accéder à la console d'administration</a></p>
    66|      <p style="color:#888;font-size:12px">Envoyé automatiquement par Commune de Cudrefins</p>
    67|    `;
    68|  } else if (type === 'conversation') {
    69|    subject = `💬 Nouvelle conversation - ${bot}`;
    70|    html = `
    71|      <h2>Nouvelle conversation démarrée</h2>
    72|      <p>Un visiteur a démarré une conversation avec <strong>${bot}</strong>.</p>
    73|      ${details?.visitorId ? `<p>Visiteur ID: <code>${details.visitorId}</code></p>` : ''}
    74|      <p><a href="${ADMIN_URL}">Accéder à la console d'administration</a></p>
    75|      <p style="color:#888;font-size:12px">Envoyé automatiquement par Commune de Cudrefins</p>
    76|    `;
    77|  } else {
    78|    return; // type inconnu
    79|  }
    80|
    81|  await fetch('https://api.resend.com/emails', {
    82|    method: 'POST',
    83|    headers: {
    84|      'Authorization': `Bearer ${apiKey}`,
    85|      'Content-Type': 'application/json',
    86|    },
    87|    body: JSON.stringify({
    88|      from: 'Commune de Cudrefins <onboarding@resend.dev>',
    89|      to,
    90|      subject,
    91|      html,
    92|    }),
    93|  });
    94|}
    95|
    96|async function notifyNewLead({ botName, name, email, phone, message }) {
    97|  const apiKey = config.resendApiKey;
    98|  if (!apiKey) return;
    99|
   100|  // Avec onboarding@resend.dev, on ne peut envoyer qu'à benjamin.loth@hotmail.com
   101|  const to = 'benjamin.loth@hotmail.com';
   102|  const bot = botName || 'un chatbot';
   103|  const contactName = name || 'Anonyme';
   104|  const contactEmail = email || 'non renseigné';
   105|  const contactPhone = phone || 'non renseigné';
   106|  const msg = message || 'pas de message';
   107|
   108|  const html = `
   109|    <h2>Nouveau contact depuis ${bot}</h2>
   110|    <table style="border-collapse:collapse;width:100%;max-width:500px">
   111|      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Nom</td><td style="padding:8px;border:1px solid #ddd">${contactName}</td></tr>
   112|      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${contactEmail}</td></tr>
   113|      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Téléphone</td><td style="padding:8px;border:1px solid #ddd">${contactPhone}</td></tr>
   114|      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Message</td><td style="padding:8px;border:1px solid #ddd">${msg}</td></tr>
   115|    </table>
   116|    <p style="color:#888;font-size:12px">Envoyé automatiquement par Commune de Cudrefins</p>
   117|  `;
   118|
   119|  await fetch('https://api.resend.com/emails', {
   120|    method: 'POST',
   121|    headers: {
   122|      'Authorization': `Bearer ${apiKey}`,
   123|      'Content-Type': 'application/json',
   124|    },
   125|    body: JSON.stringify({
   126|      from: 'Commune de Cudrefins <onboarding@resend.dev>',
   127|      to,
   128|      subject: `📩 Nouveau lead - ${bot}`,
   129|      html,
   130|    }),
   131|  });
   132|}
   133|