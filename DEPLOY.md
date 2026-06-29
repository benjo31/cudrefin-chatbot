     1|# Déploiement — guide express
     2|
     3|Le projet est prêt à déployer **tel quel** sur n'importe quelle plateforme qui sait faire tourner du Node.js avec un disque persistant. Le seed s'exécute automatiquement à chaque démarrage (idempotent : il ne recrée pas les bots/admins existants).
     4|
     5|## Variables d'environnement à définir
     6|
     7|| Nom | Valeur |
     8||---|---|
     9|| `MASTER_KEY` | 64 caractères hex (générer : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
    10|| `SESSION_SECRET` | longue chaîne aléatoire |
    11|| `ADMIN_EMAIL` | email du compte admin initial |
    12|| `ADMIN_PASSWORD` | mot de passe initial (à changer ensuite) |
    13|| `PUBLIC_BASE_URL` | URL publique finale (ex: `https://chatbot.cudrefin.ch`) |
    14|| `PORT` | injecté par la plateforme (ne pas forcer en général) |
    15|
    16|## Plateformes — étapes
    17|
    18|### Railway (recommandé, le plus simple)
    19|1. Push le dossier sur un repo GitHub.
    20|2. railway.app → **New Project** → **Deploy from GitHub repo**.
    21|3. **Variables** : ajouter les vars ci-dessus.
    22|4. **Settings → Volumes** : Mount path `/app/data` (sinon SQLite et uploads sont perdus à chaque redéploiement).
    23|5. **Settings → Networking** : Generate Domain ou ajoute ton domaine.
    24|
    25|### Render
    26|1. Push sur GitHub.
    27|2. render.com → **New → Web Service** → connecte le repo.
    28|3. Runtime : **Node**, Build : `npm install`, Start : `npm start`.
    29|4. **Environment** : ajoute les variables.
    30|5. **Disks** : ajoute un disque, Mount Path `/opt/render/project/src/data`, taille 1 Go (~$1/mois).
    31|
    32|### Fly.io
    33|```bash
    34|fly launch          # détecte le Dockerfile, accepte les défauts
    35|fly volumes create cudrefin_data --size 1
    36|# Dans fly.toml, ajouter sous [mounts]: source="cudrefin_data", destination="/app/data"
    37|fly secrets set MASTER_KEY=... SESSION_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... PUBLIC_BASE_URL=https://...
    38|fly deploy
    39|```
    40|
    41|### Docker simple (n'importe quel VPS avec Docker)
    42|```bash
    43|docker build -t cudrefin-chatbot .
    44|docker run -d --name cudrefin-chatbot \
    45|  -p 3001:3001 \
    46|  -v /srv/cudrefin-data:/app/data \
    47|  -e MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
    48|  -e SESSION_SECRET=$(openssl rand -hex 32) \
    49|  -e ADMIN_EMAIL=admin@cudrefin.ch \
    50|  -e ADMIN_PASSWORD=changeme \
    51|  -e PUBLIC_BASE_URL=https://chatbot.cudrefin.ch \
    52|  cudrefin-chatbot
    53|```
    54|
    55|Puis Nginx + Certbot devant pour le HTTPS (voir `README.md` section 4).
    56|
    57|### VPS sans Docker
    58|Voir `README.md` section 4 (PM2 + Nginx + Certbot).
    59|
    60|## Vérifications post-déploiement
    61|1. Ouvre `https://<ton-domaine>/admin/` → page de login Cudrefin.
    62|2. Login avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` → tu vois les 2 bots seedés.
    63|3. Va dans **IA / Clé API** → colle ta clé OpenAI ou Anthropic → **Tester** → ✅.
    64|4. Onglet **Intégration** → copie le snippet `<script>` et colle-le sur ton site.
    65|
    66|## Important
    67|- **Garde `MASTER_KEY` en sécurité** : si tu la perds, toutes les clés API stockées sont irrécupérables.
    68|- **Backup `./data/`** : c'est le seul dossier à sauvegarder (SQLite + uploads).
    69|- **Change `ADMIN_PASSWORD`** après le premier login (à faire via une nouvelle entrée DB ou en relançant `seed` après avoir manuellement modifié la table).
    70|