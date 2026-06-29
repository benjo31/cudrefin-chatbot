     1|(function () {
     2|  'use strict';
     3|
     4|  // -------- Bootstrap & config --------
     5|  const currentScript = document.currentScript || (() => {
     6|    const ss = document.getElementsByTagName('script');
     7|    return ss[ss.length - 1];
     8|  })();
     9|
    10|  const botId = currentScript.getAttribute('data-bot-id');
    11|  if (!botId) {
    12|    console.error('[Cudrefin Chatbot] data-bot-id manquant sur la balise <script>.');
    13|    return;
    14|  }
    15|
    16|  // Base URL = origin du script
    17|  const scriptSrc = currentScript.src;
    18|  const baseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    19|
    20|  // -------- Helpers --------
    21|  const STORE_KEY = `sx_${botId}`;
    22|  const getStore = () => {
    23|    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    24|    catch { return {}; }
    25|  };
    26|  const setStore = (v) => localStorage.setItem(STORE_KEY, JSON.stringify(v));
    27|
    28|  const h = (tag, props = {}, ...children) => {
    29|    const el = document.createElement(tag);
    30|    for (const [k, v] of Object.entries(props || {})) {
    31|      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    32|      else if (k === 'class') el.className = v;
    33|      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    34|      else if (v !== false && v != null) el.setAttribute(k, v);
    35|    }
    36|    for (const c of children) {
    37|      if (c == null || c === false) continue;
    38|      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    39|    }
    40|    return el;
    41|  };
    42|
    43|  // Simple toast notification
    44|  function toast(msg) {
    45|    const t = document.createElement('div');
    46|    t.textContent = msg;
    47|    Object.assign(t.style, {
    48|      position: 'fixed', bottom: '100px', right: '24px',
    49|      background: '#002d5d', color: '#fff', padding: '10px 18px',
    50|      borderRadius: '10px', fontSize: '13px', fontWeight: '600',
    51|      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: '2147483647',
    52|      opacity: '0', transform: 'translateY(8px)', transition: 'all 0.2s ease',
    53|    });
    54|    document.body.appendChild(t);
    55|    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    56|    setTimeout(() => {
    57|      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
    58|      setTimeout(() => t.remove(), 300);
    59|    }, 2200);
    60|  }
    61|
    62|  // -------- CSS (injecté dans Shadow DOM) --------
    63|  function buildCss(brand) {
    64|    const title = brand.titleColor || '#62a70f';
    65|    const text = brand.textColor || '#002d5d';
    66|    const bg = brand.bgColor || '#FFFFFF';
    67|    const accent = brand.accentColor || title;
    68|    const font = brand.font || "'Source Sans Pro', sans-serif";
    69|    return `
    70|      :host { all: initial; }
    71|      * { box-sizing: border-box; font-family: ${font}; }
    72|      .sx-launcher {
    73|        position: fixed; bottom: 24px; right: 24px;
    74|        width: 60px; height: 60px; border-radius: 50%;
    75|        background: ${title}; color: #fff;
    76|        display: flex; align-items: center; justify-content: center;
    77|        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    78|        cursor: pointer; border: none; z-index: 2147483646;
    79|        transition: transform .15s ease;
    80|      }
    81|      .sx-launcher:hover { transform: scale(1.06); }
    82|      .sx-launcher svg { width: 26px; height: 26px; fill: #fff; }
    83|
    84|      .sx-panel {
    85|        position: fixed; bottom: 96px; right: 24px;
    86|        width: 380px; max-width: calc(100vw - 32px);
    87|        height: 600px; max-height: calc(100vh - 120px);
    88|        background: ${bg}; color: ${text};
    89|        border-radius: 16px;
    90|        box-shadow: 0 20px 60px rgba(0,0,0,0.22);
    91|        display: none; flex-direction: column;
    92|        overflow: hidden; z-index: 2147483647;
    93|        animation: sxSlide .25s ease;
    94|      }
    95|      .sx-panel.sx-open { display: flex; }
    96|      @keyframes sxSlide {
    97|        from { opacity: 0; transform: translateY(12px); }
    98|        to   { opacity: 1; transform: translateY(0); }
    99|      }
   100|
   101|      .sx-header {
   102|        background: ${bg};
   103|        padding: 14px 16px;
   104|        border-bottom: 1px solid rgba(0,0,0,0.06);
   105|        display: flex; align-items: center; gap: 12px;
   106|      }
   107|      .sx-logo { height: 28px; max-width: 130px; object-fit: contain; }
   108|      .sx-title { color: ${title}; font-weight: 700; font-size: 16px; flex: 1; }
   109|      .sx-close {
   110|        background: none; border: none; cursor: pointer;
   111|        color: ${text}; font-size: 22px; line-height: 1; padding: 4px 8px;
   112|      }
   113|
   114|      .sx-body {
   115|        flex: 1; overflow-y: auto;
   116|        padding: 16px; display: flex; flex-direction: column; gap: 10px;
   117|        background: ${bg};
   118|      }
   119|      .sx-msg { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 14.5px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
   120|      .sx-msg-bot   { background: #f3f6fa; color: ${text}; align-self: flex-start; border-bottom-left-radius: 4px; }
   121|      .sx-msg-user  { background: ${accent}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
   122|      .sx-typing { display: inline-flex; gap: 4px; padding: 12px 14px; background: #f3f6fa; border-radius: 14px; align-self: flex-start; }
   123|      .sx-typing span { width: 6px; height: 6px; border-radius: 50%; background: ${text}; opacity: .4; animation: sxBounce 1.2s infinite ease-in-out; }
   124|      .sx-typing span:nth-child(2) { animation-delay: .15s; }
   125|      .sx-typing span:nth-child(3) { animation-delay: .3s; }
   126|      @keyframes sxBounce { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-5px); opacity: 1; } }
   127|
   128|      .sx-lead-cta {
   129|        align-self: flex-start; margin-top: 4px;
   130|        background: ${title}; color: #fff;
   131|        border: none; border-radius: 10px; cursor: pointer;
   132|        padding: 9px 14px; font-size: 13.5px; font-weight: 600;
   133|      }
   134|
   135|      .sx-footer { border-top: 1px solid rgba(0,0,0,0.06); padding: 10px; background: ${bg}; }
   136|      .sx-input-row { display: flex; gap: 8px; }
   137|      .sx-input {
   138|        flex: 1; padding: 10px 12px;
   139|        border: 1px solid rgba(0,0,0,0.12); border-radius: 10px;
   140|        font-size: 14px; color: ${text}; background: #fff; outline: none;
   141|        font-family: ${font};
   142|      }
   143|      .sx-input:focus { border-color: ${title}; }
   144|      .sx-send {
   145|        background: ${title}; color: #fff; border: none;
   146|        border-radius: 10px; padding: 0 14px; cursor: pointer; font-weight: 600;
   147|      }
   148|      .sx-send:disabled { opacity: .5; cursor: not-allowed; }
   149|      .sx-poweredby { text-align: center; font-size: 11px; color: rgba(0,0,0,0.45); padding: 6px 0 2px; }
   150|      .sx-poweredby a { color: inherit; text-decoration: none; }
   151|
   152|      /* Avatar toggle button in footer */
   153|      .sx-avatar-btn {
   154|        background: rgba(0,0,0,0.04); color: ${text};
   155|        border: 1px solid rgba(0,0,0,0.08); border-radius: 10px;
   156|        padding: 0 10px; cursor: pointer; font-size: 14px; font-weight: 500;
   157|        white-space: nowrap; font-family: ${font};
   158|        transition: all 0.15s ease;
   159|      }
   160|      .sx-avatar-btn:hover { background: rgba(0,0,0,0.07); }
   161|
   162|      /* Avatar overlay - full panel takeover */
   163|      .sx-avatar-overlay {
   164|        display: none;
   165|        position: absolute; inset: 0;
   166|        background: #0d0d1a;
   167|        z-index: 20;
   168|        flex-direction: column;
   169|        border-radius: 16px;
   170|        overflow: hidden;
   171|      }
   172|      .sx-avatar-overlay.sx-open { display: flex; }
   173|      .sx-avatar-overlay .sx-av-head {
   174|        display: flex; align-items: center; justify-content: center;
   175|        padding: 16px 16px 0;
   176|        position: relative;
   177|      }
   178|      .sx-avatar-overlay .sx-av-head .sx-av-name {
   179|        color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500;
   180|      }
   181|      .sx-avatar-overlay .sx-av-head .sx-av-back {
   182|        position: absolute; left: 12px; top: 12px;
   183|        background: rgba(255,255,255,0.08); border: none; color: #fff;
   184|        padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13px;
   185|      }
   186|      .sx-avatar-overlay .sx-av-video {
   187|        flex: 1;
   188|        display: flex; align-items: center; justify-content: center;
   189|        padding: 12px;
   190|      }
   191|      .sx-avatar-overlay .sx-av-video video {
   192|        max-width: 100%; max-height: 100%;
   193|        border-radius: 16px; object-fit: contain;
   194|        box-shadow: 0 0 60px rgba(98,167,15,0.08);
   195|      }
   196|      .sx-avatar-overlay .sx-av-status {
   197|        text-align: center;
   198|        padding: 0 16px 8px;
   199|        min-height: 20px;
   200|        font-size: 12px; color: rgba(255,255,255,0.35);
   201|      }
   202|      .sx-avatar-overlay .sx-av-status .sx-av-dots span {
   203|        display: inline-block; width: 5px; height: 5px;
   204|        border-radius: 50%; background: ${accent};
   205|        margin: 0 2px; animation: sxAvPulse 1s ease-in-out infinite;
   206|      }
   207|      .sx-avatar-overlay .sx-av-status .sx-av-dots span:nth-child(2) { animation-delay: 0.15s; }
   208|      .sx-avatar-overlay .sx-av-status .sx-av-dots span:nth-child(3) { animation-delay: 0.3s; }
   209|      @keyframes sxAvPulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
   210|
   211|      .sx-avatar-overlay .sx-av-footer {
   212|        padding: 12px 16px 16px;
   213|      }
   214|      .sx-avatar-overlay .sx-av-input-row {
   215|        display: flex; gap: 8px;
   216|      }
   217|      .sx-avatar-overlay .sx-av-input {
   218|        flex: 1; padding: 10px 14px;
   219|        background: rgba(255,255,255,0.06);
   220|        border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
   221|        font-size: 14px; color: #fff; outline: none; font-family: ${font};
   222|      }
   223|      .sx-avatar-overlay .sx-av-input:focus { border-color: ${accent}; }
   224|      .sx-avatar-overlay .sx-av-input::placeholder { color: rgba(255,255,255,0.3); }
   225|      .sx-avatar-overlay .sx-av-send {
   226|        background: ${accent}; color: #fff; border: none;
   227|        border-radius: 10px; padding: 0 16px; cursor: pointer; font-weight: 600;
   228|      }
   229|      .sx-avatar-overlay .sx-av-send:disabled { opacity: 0.3; cursor: not-allowed; }
   230|
   231|      /* Lead form modal */
   232|      .sx-modal-backdrop {
   233|        position: absolute; inset: 0; background: rgba(0,45,93,0.35);
   234|        display: none; align-items: center; justify-content: center; z-index: 10;
   235|      }
   236|      .sx-modal-backdrop.sx-open { display: flex; }
   237|      .sx-modal {
   238|        background: ${bg}; border-radius: 14px; padding: 18px;
   239|        width: 90%; max-width: 320px;
   240|        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
   241|      }
   242|      .sx-modal h3 { margin: 0 0 12px; color: ${title}; font-size: 16px; }
   243|      .sx-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
   244|      .sx-field label { font-size: 12px; color: ${text}; font-weight: 600; }
   245|      .sx-field input, .sx-field textarea {
   246|        padding: 9px 11px; border: 1px solid rgba(0,0,0,0.12);
   247|        border-radius: 8px; font-size: 13.5px; color: ${text}; font-family: ${font};
   248|        outline: none; resize: vertical;
   249|      }
   250|      .sx-field input:focus, .sx-field textarea:focus { border-color: ${title}; }
   251|      .sx-modal-actions { display: flex; gap: 8px; margin-top: 6px; }
   252|      .sx-modal-actions button {
   253|        flex: 1; padding: 9px 12px; border-radius: 9px;
   254|        border: none; cursor: pointer; font-weight: 600; font-size: 13.5px;
   255|      }
   256|      .sx-btn-cancel { background: #f0f2f5; color: ${text}; }
   257|      .sx-btn-submit { background: ${title}; color: #fff; }
   258|      .sx-thanks { color: ${title}; font-weight: 600; text-align: center; padding: 10px 0; }
   259|
   260|      @media (max-width: 480px) {
   261|        .sx-panel {
   262|          width: calc(100vw - 16px); height: calc(100vh - 100px); right: 8px; bottom: 80px;
   263|        }
   264|      }
   265|    `;
   266|  }
   267|
   268|  // -------- Font loading (Source Sans Pro) --------
   269|  function ensureFont() {
   270|    if (document.querySelector('link[data-sx-font]')) return;
   271|    const l = document.createElement('link');
   272|    l.rel = 'stylesheet';
   273|    l.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap';
   274|    l.setAttribute('data-sx-font', '1');
   275|    document.head.appendChild(l);
   276|  }
   277|
   278|  // -------- Main mount --------
   279|  async function mount() {
   280|    let config;
   281|    try {
   282|      const r = await fetch(`${baseUrl}/api/public/bots/${botId}/config`);
   283|      if (!r.ok) throw new Error('config_fetch_failed');
   284|      config = await r.json();
   285|    } catch (e) {
   286|      console.error('[Cudrefin Chatbot] Impossible de charger la configuration:', e);
   287|      return;
   288|    }
   289|
   290|    ensureFont();
   291|    const brand = config.branding || {};
   292|    const heygenEnabled = config.heygenEnabled;
   293|
   294|    // Container + Shadow DOM
   295|    const host = document.createElement('div');
   296|    host.id = 'cudrefin-chatbot-host';
   297|    document.body.appendChild(host);
   298|    const shadow = host.attachShadow({ mode: 'open' });
   299|    const style = document.createElement('style');
   300|    style.textContent = buildCss(brand);
   301|    shadow.appendChild(style);
   302|
   303|    // Launcher button
   304|    const launcher = h('button', { class: 'sx-launcher', 'aria-label': 'Ouvrir le chat' },
   305|      (() => {
   306|        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
   307|        svg.setAttribute('viewBox', '0 0 24 24');
   308|        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
   309|        p.setAttribute('d', 'M20 2H4c-1.1 0-2 .9-2 2v14l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z');
   310|        svg.appendChild(p);
   311|        return svg;
   312|      })()
   313|    );
   314|    shadow.appendChild(launcher);
   315|
   316|    // Panel
   317|    const body = h('div', { class: 'sx-body' });
   318|    const input = h('input', { class: 'sx-input', type: 'text', placeholder: 'Écrivez votre message…', autocomplete: 'off' });
   319|    const sendBtn = h('button', { class: 'sx-send' }, 'Envoyer');
   320|
   321|    // Avatar button (visible only if enabled)
   322|    const avatarPreviewUrl = config.heygenAvatarPreview;
   323|    const avatarBtnContent = avatarPreviewUrl
   324|      ? h('img', { src: avatarPreviewUrl, style: 'width:22px;height:22px;border-radius:11px;object-fit:cover;vertical-align:middle;margin-right:4px' })
   325|      : '🎭';
   326|    const avatarBtn = heygenEnabled
   327|      ? h('button', { class: 'sx-avatar-btn', title: 'Mode avatar' }, avatarBtnContent)
   328|      : null;
   329|
   330|    const footerChildren = avatarBtn
   331|      ? [h('div', { class: 'sx-input-row' }, avatarBtn, input, sendBtn)]
   332|      : [h('div', { class: 'sx-input-row' }, input, sendBtn)];
   333|    footerChildren.push(h('div', { class: 'sx-poweredby' }, 'Propulsé par Cudrefin'));
   334|    const footer = h('div', { class: 'sx-footer' }, ...footerChildren);
   335|
   336|    const closeBtn = h('button', { class: 'sx-close', 'aria-label': 'Fermer' }, '×');
   337|    const headerEls = [];
   338|    if (brand.logoUrl) headerEls.push(h('img', { class: 'sx-logo', src: brand.logoUrl, alt: config.name || 'Logo' }));
   339|    headerEls.push(h('div', { class: 'sx-title' }, config.name || 'Assistant'));
   340|    headerEls.push(closeBtn);
   341|    const header = h('div', { class: 'sx-header' }, ...headerEls);
   342|
   343|    // ---- Avatar overlay ----
   344|    let avatarOverlay = null;
   345|    let avatarSession = null; // LiveAvatarSession instance
   346|    let avatarReady = false;
   347|    let avatarSpeaking = false;
   348|
   349|    // Avatar DOM elements (created inside if(heygenEnabled))
   350|    let avVideo = null;
   351|    let avStatus = null;
   352|    let avInput = null;
   353|    let avSend = null;
   354|    let avBack = null;
   355|
   356|    function avatarStatus(msg) {
   357|      if (avStatus) avStatus.textContent = msg;
   358|    }
   359|
   360|    if (heygenEnabled) {
   361|      avVideo = h('video', { autoplay: true, muted: true, playsinline: true });
   362|      avStatus = h('div', { class: 'sx-av-status' }, 'Appuyez sur Entrée pour parler à Lumia');
   363|      avInput = h('input', { class: 'sx-av-input', type: 'text', placeholder: 'Écrivez votre message…', autocomplete: 'off' });
   364|      avSend = h('button', { class: 'sx-av-send' }, 'Envoyer');
   365|      avBack = h('button', { class: 'sx-av-back' }, '←  Chat');
   366|      const avFooter = h('div', { class: 'sx-av-footer' },
   367|        h('div', { class: 'sx-av-input-row' }, avInput, avSend)
   368|      );
   369|
   370|      avatarOverlay = h('div', { class: 'sx-avatar-overlay' },
   371|        h('div', { class: 'sx-av-head' },
   372|          avBack,
   373|          h('span', { class: 'sx-av-name' }, '🎭  ' + (config.name || 'Assistant'))
   374|        ),
   375|        h('div', { class: 'sx-av-video' }, avVideo),
   376|        avStatus,
   377|        avFooter
   378|      );
   379|
   380|      avBack.addEventListener('click', closeAvatarMode);
   381|      avSend.addEventListener('click', () => avatarSend(avInput.value));
   382|      avInput.addEventListener('keydown', (e) => {
   383|        if (e.key === 'Enter') { e.preventDefault(); avatarSend(avInput.value); }
   384|      });
   385|    }
   386|
   387|    // Avatar send logic — gets LLM reply, then sends to avatar SDK
   388|    async function avatarSend(text) {
   389|      if (!text.trim() || !avatarReady || !avatarSession) return;
   390|      if (!avInput) return;
   391|      avInput.value = '';
   392|      if (avSend) avSend.disabled = true;
   393|      avatarStatus('🧠 Réflexion…');
   394|      try {
   395|        await ensureConversation();
   396|
   397|        // Get LLM reply as plain JSON (no SSE)
   398|        const resp = await fetch(`${baseUrl}/api/public/bots/${botId}/heygen/chat`, {
   399|          method: 'POST',
   400|          headers: { 'Content-Type': 'application/json' },
   401|          body: JSON.stringify({ conversationId, message: text }),
   402|        });
   403|        if (!resp.ok) {
   404|          const errBody = await resp.json().catch(() => ({}));
   405|          // If session expired, the client can re-init
   406|          if (resp.status === 400 && errBody.action === 'restart') {
   407|            avatarStatus('⚠ Session expirée, rechargez l\'avatar');
   408|            return;
   409|          }
   410|          throw new Error(errBody.error || 'chat_failed');
   411|        }
   412|        const data = await resp.json();
   413|        const reply = data.reply || '';
   414|
   415|        if (reply.trim()) {
   416|          avatarStatus('🎙 Lumia parle…');
   417|          // Send the text to the avatar SDK via the message() method
   418|          avatarSession.message(reply);
   419|        } else {
   420|          avatarStatus('✔ Pas de réponse');
   421|        }
   422|      } catch (e) {
   423|        console.error('[avatar] send error:', e);
   424|        avatarStatus('⚠ Erreur, réessayez');
   425|      } finally {
   426|        avatarSpeaking = false;
   427|        if (avSend) avSend.disabled = false;
   428|        setTimeout(() => {
   429|          if (!avatarSpeaking && avatarReady) avatarStatus('Appuyez sur Entrée pour parler à Lumia');
   430|        }, 1500);
   431|      }
   432|    }
   433|
   434|    function closeAvatarMode() {
   435|      if (!avatarOverlay) return;
   436|      avatarOverlay.classList.remove('sx-open');
   437|      if (avatarBtn) avatarBtn.classList.remove('sx-active');
   438|      avatarReady = false;
   439|      if (avatarSession) {
   440|        try {
   441|          avatarSession.stop().catch(() => {});
   442|        } catch (e) {
   443|          // Ignore errors on stop
   444|        }
   445|        avatarSession = null;
   446|      }
   447|      fetch(`${baseUrl}/api/public/bots/${botId}/heygen/stop`, {
   448|        method: 'POST', headers: { 'Content-Type': 'application/json' },
   449|      }).catch(() => {});
   450|      setTimeout(() => input.focus(), 100);
   451|    }
   452|
   453|    function openAvatarMode() {
   454|      if (!avatarOverlay) return;
   455|      avatarOverlay.classList.add('sx-open');
   456|      if (avatarBtn) avatarBtn.classList.add('sx-active');
   457|      const avInputEl = avatarOverlay.querySelector('.sx-av-input');
   458|      setTimeout(() => avInputEl?.focus(), 100);
   459|      avatarStatus('🚀 Connexion…');
   460|      console.log('[avatar] openAvatarMode called, loading SDK...');
   461|
   462|      // 1. Load the HeyGen SDK dynamically
   463|      loadHeyGenSDK().then(() => {
   464|        console.log('[avatar] SDK loaded, fetching token...');
   465|        // 2. Get token from our backend — with a 30s timeout
   466|        const controller = new AbortController();
   467|        const timeoutId = setTimeout(() => controller.abort(), 60000);
   468|        return fetch(`${baseUrl}/api/public/bots/${botId}/heygen/start`, {
   469|          method: 'POST', headers: { 'Content-Type': 'application/json' },
   470|          signal: controller.signal,
   471|        }).finally(() => clearTimeout(timeoutId));
   472|      }).then(r => {
   473|        console.log('[avatar] token response status:', r.status);
   474|        return r.text().then(text => {
   475|          console.log('[avatar] token response body:', text);
   476|          if (!r.ok) {
   477|            let detail;
   478|            try { const j = JSON.parse(text); detail = j.error || j.detail || JSON.stringify(j); } catch(e) { detail = text; }
   479|            throw new Error('HTTP ' + r.status + ': ' + detail);
   480|          }
   481|          return JSON.parse(text);
   482|        });
   483|      }).then(data => {
   484|        console.log('[avatar] token data:', JSON.stringify(data));
   485|        const token = data.session_token || data.token;
   486|        if (!token) throw new Error('no_token: field missing from response');
   487|
   488|        // 3. Create and start LiveAvatar session
   489|        avatarReady = false;
   490|        const LiveAvatarSessionClass = window.LiveAvatarSDK.LiveAvatarSession;
   491|        avatarSession = new LiveAvatarSessionClass(token);
   492|        console.log('[avatar] LiveAvatarSession created');
   493|
   494|        // Listen for stream ready — attach video
   495|        avatarSession.on('session.stream_ready', () => {
   496|          console.log('[avatar] stream_ready event fired');
   497|          const videoEl = avatarOverlay.querySelector('.sx-av-video video');
   498|          if (videoEl) {
   499|            avatarSession.attach(videoEl);
   500|            videoEl.play().catch(() => {});
   501|