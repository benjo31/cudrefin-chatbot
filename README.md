     1|# Cudrefin Chatbots
     2|
     3|Plateforme multi-tenants de chatbots custom (interne + externe) pour Cudrefin.
     4|
     5|- **Backend** : Node.js + Express + SQLite (better-sqlite3)
     6|- **LLM** : OpenAI ou Anthropic, clé API saisie depuis l'UI (chiffrée AES-256-GCM)
     7|- **Widget** : un seul `<script>` à coller dans n'importe quel site (Shadow DOM, zéro collision CSS)
     8|- **Dashboard admin** : HTML/JS vanilla, login email/mot de passe, gestion des bots, documents, leads et conversations.
     9|
    10|---
    11|
    12|## 1. Démarrage local
    13|
    14|Prérequis : Node 20+.
    15|
    16|```bash
    17|cd cudrefin-chatbot
    18|npm install
    19|cp .env.example .env
    20|
    21|# Génère une MASTER_KEY (32 octets hex)
    22|node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    23|# Colle le résultat dans MASTER_KEY=
    24|
    25|# Choisis aussi un SESSION_SECRET long et change ADMIN_PASSWORD
    26|```
    27|
    28|Crée l'admin et les 2 bots de démo :
    29|```bash
    30|npm run seed
    31|```
    32|
    33|Démarre :
    34|```bash
    35|npm run dev   # node --watch (rechargement auto)
    36|# ou
    37|npm start
    38|```
    39|
    40|Ouvre `http://localhost:3001/admin/` → connecte-toi avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
    41|
    42|---
    43|
    44|## 2. Utilisation (côté admin)
    45|
    46|1. **Crée un chatbot** depuis la barre latérale (audience `Externe` ou `Interne`).
    47|2. **Onglet IA / Clé API** : choisis le fournisseur (OpenAI / Anthropic), le modèle, colle la clé API, clique sur **Tester**. Enregistre.
    48|3. **Onglet Documents** : glisse-dépose PDF / DOCX / TXT / images. Le texte est extrait et stocké. Surveille la barre "caractères utilisés".
    49|4. **Onglet Général** : ajuste le périmètre (`scope_topics`), le message de refus hors-sujet, la persona.
    50|5. **Onglet Contact** : email / tél / adresse / horaires / URL — fournis au bot pour qu'il puisse les communiquer.
    51|6. **Onglet Branding** : couleurs, police, logo. Valeurs Cudrefin pré-remplies. Aperçu live.
    52|7. **Onglet Intégration** : copie le snippet `<script>` et colle-le sur le site cible. Configure les domaines autorisés (CORS).
    53|
    54|### Intégration sur un site
    55|
    56|```html
    57|<script src="https://chatbot.cudrefin.ch/widget.js" data-bot-id="xxxxxxxxxxxx" defer></script>
    58|```
    59|
    60|À coller dans `<body>` (juste avant `</body>`) ou dans `<head>` (avec `defer`).
    61|
    62|---
    63|
    64|## 3. Architecture des données
    65|
    66|- `bots` : configuration de chaque chatbot (audience, persona, scope, branding, contact, provider/modèle, clé chiffrée).
    67|- `documents` : fichiers uploadés + leur **texte extrait** (le binaire n'est pas conservé).
    68|- `conversations` / `messages` : historique pour fenêtre glissante et audit.
    69|- `leads` : prises de contact (formulaire intégré au widget, déclenché par intention détectée).
    70|
    71|Stockage : `./data/cudrefin.db` (SQLite WAL). **C'est le seul dossier à backuper.**
    72|
    73|### Garde-fous du bot
    74|
    75|Le system prompt force :
    76|- Réponse uniquement dans le `scope_topics`.
    77|- Hors-sujet → réponse exacte = `refusal_message`.
    78|- Pas de réponses générales (météo, code, etc.) hors périmètre.
    79|- Connaissance limitée aux documents fournis.
    80|
    81|### Sécurité clé API
    82|Les clés sont chiffrées **AES-256-GCM** avec `MASTER_KEY` (jamais en clair en base, jamais renvoyées au front).
    83|**Conserve `MASTER_KEY` en sécurité** : sans elle les clés stockées sont irrécupérables.
    84|
    85|---
    86|
    87|## 4. Déploiement VPS (Hetzner/OVH/DigitalOcean)
    88|
    89|### Prérequis serveur
    90|- Ubuntu 22.04+ / Debian 12+
    91|- Node 20+, build tools (`apt install build-essential` — better-sqlite3 compile en natif)
    92|- Nginx, certbot
    93|
    94|### Mise en place
    95|```bash
    96|# 1. Cloner ou rsync le dossier cudrefin-chatbot/ vers /opt/cudrefin-chatbot
    97|sudo mkdir -p /opt/cudrefin-chatbot
    98|sudo chown $USER:$USER /opt/cudrefin-chatbot
    99|rsync -av --exclude node_modules --exclude data --exclude .env ./cudrefin-chatbot/ user@vps:/opt/cudrefin-chatbot/
   100|
   101|# 2. Sur le VPS
   102|cd /opt/cudrefin-chatbot
   103|npm ci --omit=dev
   104|cp .env.example .env
   105|nano .env     # génère MASTER_KEY, SESSION_SECRET, ADMIN_PASSWORD, PUBLIC_BASE_URL=https://chatbot.cudrefin.ch
   106|node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   107|npm run seed
   108|```
   109|
   110|### PM2 (gestionnaire de process)
   111|```bash
   112|sudo npm i -g pm2
   113|pm2 start server.js --name cudrefin-chatbot
   114|pm2 save
   115|pm2 startup   # suit l'instruction affichée
   116|```
   117|
   118|### Nginx (reverse proxy + SSE)
   119|```nginx
   120|server {
   121|  listen 80;
   122|  server_name chatbot.cudrefin.ch;
   123|
   124|  location / {
   125|    proxy_pass http://127.0.0.1:3001;
   126|    proxy_http_version 1.1;
   127|    proxy_set_header Host $host;
   128|    proxy_set_header X-Real-IP $remote_addr;
   129|    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   130|    proxy_set_header X-Forwarded-Proto $scheme;
   131|
   132|    # SSE / streaming
   133|    proxy_buffering off;
   134|    proxy_cache off;
   135|    proxy_read_timeout 3600s;
   136|  }
   137|}
   138|```
   139|
   140|```bash
   141|sudo certbot --nginx -d chatbot.cudrefin.ch
   142|```
   143|
   144|### Backup
   145|Sauvegarde `./data/` (DB SQLite + uploads). Exemple avec `restic` ou simple `rsync` quotidien vers stockage offsite.
   146|
   147|---
   148|
   149|## 5. Personnalisation
   150|
   151|- **Limite de connaissance par bot** : `maxKnowledgeChars` dans `src/config.js` (par défaut 80 000 chars ≈ 150 pages). Si dépassé, le texte est tronqué (préfère un découpage manuel + résumés).
   152|- **Fenêtre de contexte conversationnel** : `conversationWindow` (12 derniers messages).
   153|- **OCR images** : `ENABLE_OCR=1` + `npm i tesseract.js`. Sinon le texte des images est ignoré.
   154|- **Limite taille upload** : `25 MB` (voir `multer` dans `src/routes/admin.js`).
   155|- **Modèles par défaut** : `gpt-4o-mini` (OpenAI) et `claude-haiku-4-5` (Anthropic). Modifiables par bot.
   156|
   157|---
   158|
   159|## 6. Test end-to-end
   160|
   161|1. Crée un bot "Test", colle ta clé OpenAI → **Tester** doit renvoyer ✅.
   162|2. Uploade un PDF d'environ 5 pages → vérifie le compteur "caractères utilisés".
   163|3. Onglet Général : limite explicitement le scope ("Réponds uniquement sur le contenu de ce PDF.") avec un refus clair.
   164|4. Onglet Intégration : copie le snippet, colle-le dans un fichier `test.html` local (`python3 -m http.server`).
   165|5. Ouvre la page → la bulle s'affiche avec les couleurs Cudrefin.
   166|6. Pose une question dans le scope → réponse cohérente avec le PDF (streaming).
   167|7. Pose une question hors scope → exactement le `refusal_message`.
   168|8. Demande "Pouvez-vous me rappeler ?" → le bot doit déclencher le formulaire de prise de contact.
   169|9. Soumets le formulaire → l'onglet **Leads** doit l'afficher.
   170|10. Crée un 2e bot avec une autre clé/audience pour vérifier l'isolation des données.
   171|
   172|---
   173|
   174|## 7. Limites assumées (MVP)
   175|
   176|- Pas de RAG vectorielle : tout est concaténé dans le system prompt → bon pour ~150 pages de doc / bot.
   177|  → À l'usage si dépassement : ajouter `sqlite-vec` + embeddings (changement isolé dans `src/chat.js`).
   178|- 1 seul admin par défaut (extensible : table `admins` déjà multi-comptes).
   179|- Pas d'email automatique sur nouveau lead (export CSV disponible).
   180|- FR uniquement côté widget.
   181|