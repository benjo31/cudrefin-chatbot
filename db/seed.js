import { nanoid } from 'nanoid';
import { sb } from '../src/db.js';
import { hashPassword } from '../src/auth.js';
import { config } from '../src/config.js';

const CUDREFIN_BRANDING = {
  titleColor: '#2db6c3',
  textColor: '#003d5e',
  bgColor: '#FFFFFF',
  accentColor: '#2db6c3',
  font: "'Source Sans Pro', sans-serif",
  logoUrl: '/logo-cudrefin.svg',
};

const CUDREFIN_CONTACT = {
  email: 'admin@cudrefin.ch',
  phone: '',
  address: '',
  hours: '',
  url: 'https://cudrefin.ch',
};

async function main() {
  // Admin par défaut
  const { data: existing } = await sb.from('admins').select('id').eq('email', config.adminEmail).maybeSingle();
  if (!existing) {
    const hash = await hashPassword(config.adminPassword);
    const { error } = await sb.from('admins').insert({ email: config.adminEmail, password_hash: hash });
    if (error) throw error;
    console.log(`[seed] Admin créé : ${config.adminEmail} / ${config.adminPassword}`);
  } else {
    console.log(`[seed] Admin déjà existant : ${config.adminEmail}`);
  }

  // Bot de démo si aucun bot existant
  const { count: botCount, error: countErr } = await sb.from('bots').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('[seed] Erreur count bots:', countErr.message);
    return;
  }
  if (!botCount || botCount === 0) {
    async function make(name, audience, welcome, scope, refusal) {
      const id = nanoid(12);
      const { error } = await sb.from('bots').insert({
        id, name, audience,
        system_prompt: `Tu es l'assistant ${name} de la Commune de Cudrefin. Tu es professionnel, concis et utile. Tu réponds en français.`,
        scope_topics: scope,
        refusal_message: refusal,
        welcome_message: welcome,
        contact_info_json: JSON.stringify(CUDREFIN_CONTACT),
        branding_json: JSON.stringify(CUDREFIN_BRANDING),
        llm_provider: 'openai',
        llm_model: 'gpt-4o-mini',
        lead_capture_enabled: audience === 'public' ? 1 : 0,
        allowed_origins: '*',
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      console.log(`[seed] Bot créé : ${name} (id=${id})`);
    }
    await make(
      'Assistant Cudrefin', 'public',
      'Bonjour ! Je suis l\'assistant de la Commune de Cudrefin. Comment puis-je vous aider ?',
      'Les services communaux, horaires, démarches administratives et informations sur Cudrefin.',
      'Désolé, je ne suis pas en mesure de répondre à cette question. Je peux vous aider sur les sujets liés aux services de la Commune de Cudrefin.'
    );
  } else {
    console.log(`[seed] ${botCount} bot(s) déjà présent(s), pas de création.`);
  }

  console.log('[seed] Terminé.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
