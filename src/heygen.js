     1|/**
     2| * HeyGen LiveAvatar integration for Cudrefin Chatbot
     3| * 
     4| * Uses the LiveAvatar API (api.liveavatar.com) to generate
     5| * session tokens that the client-side SDK uses for WebRTC streaming.
     6| * 
     7| * API docs: https://docs.liveavatar.com/api-reference/sessions/create-session-token
     8| */
     9|
    10|const LIVEAVATAR_API_BASE = 'https://api.liveavatar.com';
    11|
    12|/**
    13| * Create a session token from the LiveAvatar API.
    14| * This token is passed to the client SDK (LiveAvatarSession)
    15| * which handles WebRTC + WebSocket streaming.
    16| * 
    17| * POST /v1/sessions/token
    18| * Returns: { session_id, session_token }
    19| */
    20|export async function createSessionToken(apiKey, avatarId, mode = 'LITE') {
    21|  const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/sessions/token`, {
    22|    method: 'POST',
    23|    headers: {
    24|      'X-API-KEY': apiKey,
    25|      'Content-Type': 'application/json',
    26|    },
    27|    body: JSON.stringify({
    28|      avatar_id: avatarId,
    29|      mode,
    30|      is_sandbox: false,
    31|    }),
    32|  });
    33|  if (!res.ok) {
    34|    const text = await res.text();
    35|    throw new Error(`LiveAvatar token request failed: ${text}`);
    36|  }
    37|  const json = await res.json();
    38|  if (json.code !== 1000) {
    39|    throw new Error(`LiveAvatar API error: ${json.message || 'unknown'}`);
    40|  }
    41|  return json.data; // { session_id, session_token }
    42|}
    43|
    44|/**
    45| * Test if a LiveAvatar API key is valid
    46| */
    47|export async function testApiKey(apiKey) {
    48|  try {
    49|    const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/avatars/public`, {
    50|      headers: { 'X-API-KEY': apiKey },
    51|    });
    52|    return res.ok;
    53|  } catch {
    54|    return false;
    55|  }
    56|}
    57|
    58|/**
    59| * List available avatars for the LiveAvatar account
    60| */
    61|export async function listAvatars(apiKey) {
    62|  const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/avatars`, {
    63|    headers: { 'X-API-KEY': apiKey },
    64|  });
    65|  if (!res.ok) throw new Error(`LiveAvatar listAvatars failed`);
    66|  const json = await res.json();
    67|  return json.data?.results || [];
    68|}
    69|
    70|/**
    71| * List public avatars available on LiveAvatar
    72| */
    73|export async function listPublicAvatars(apiKey) {
    74|  const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/avatars/public?page_size=100`, {
    75|    headers: { 'X-API-KEY': apiKey },
    76|  });
    77|  if (!res.ok) throw new Error(`LiveAvatar listPublicAvatars failed`);
    78|  const json = await res.json();
    79|  return json.data?.results || [];
    80|}
    81|
    82|/**
    83| * List available voices for a LiveAvatar account
    84| */
    85|export async function listVoices(apiKey) {
    86|  const res = await fetch(`${LIVEAVATAR_API_BASE}/v1/voices`, {
    87|    headers: { 'X-API-KEY': apiKey },
    88|  });
    89|  if (!res.ok) throw new Error(`LiveAvatar listVoices failed`);
    90|  const json = await res.json();
    91|  return json.data?.results || [];
    92|}
    93|
    94|/**
    95| * Get the HeyGen/LiveAvatar configuration from a bot's branding_json
    96| */
    97|export function getHeyGenConfig(bot) {
    98|  const branding = bot.branding_json ? JSON.parse(bot.branding_json) : {};
    99|  return branding.heygen || {};
   100|}
   101|
   102|/**
   103| * Save HeyGen config to a bot's branding_json
   104| */
   105|export function setHeyGenConfig(bot, heygenConfig) {
   106|  const branding = bot.branding_json ? JSON.parse(bot.branding_json) : {};
   107|  branding.heygen = heygenConfig;
   108|  return JSON.stringify(branding);
   109|}
   110|