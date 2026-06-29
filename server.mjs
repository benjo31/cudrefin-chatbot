     1|import express from 'express';
     2|import cookieParser from 'cookie-parser';
     3|import path from 'node:path';
     4|import { fileURLToPath } from 'node:url';
     5|import { config } from './src/config.js';
     6|import './src/db.js'; // init DB
     7|import { publicRouter } from './src/routes/public.js';
     8|import { adminRouter } from './src/routes/admin.js';
     9|
    10|// ---- Process-level crash prevention ----
    11|// Node 20+ exits the process on unhandled rejections by default.
    12|// These handlers ensure Render's proxy never sees a 502 from a crashed process.
    13|process.on('unhandledRejection', (reason, promise) => {
    14|  console.error('[process] UNHANDLED REJECTION:', reason?.stack || reason?.message || reason);
    15|});
    16|process.on('uncaughtException', (err) => {
    17|  console.error('[process] UNCAUGHT EXCEPTION:', err?.stack || err?.message || err);
    18|});
    19|
    20|const __dirname = path.dirname(fileURLToPath(import.meta.url));
    21|const app = express();
    22|
    23|app.use(express.json({ limit: '2mb' }));
    24|app.use(cookieParser());
    25|
    26|// API
    27|app.use('/api/public', publicRouter);
    28|app.use('/api/admin', adminRouter);
    29|
    30|// Widget statique (avec en-têtes CORS permissifs car appelé depuis n'importe quel site)
    31|app.get('/widget.js', (req, res) => {
    32|  res.setHeader('Access-Control-Allow-Origin', '*');
    33|  res.setHeader('Cache-Control', 'public, max-age=300');
    34|  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
    35|});
    36|
    37|// HeyGen LiveAvatar Web SDK (servi statiquement pour le widget)
    38|app.get('/vendor/heygen-liveavatar-sdk.js', (req, res) => {
    39|  res.setHeader('Access-Control-Allow-Origin', '*');
    40|  res.setHeader('Cache-Control', 'public, max-age=86400');
    41|  res.sendFile(path.join(__dirname, 'node_modules/@heygen/liveavatar-web-sdk/dist/index.umd.js'));
    42|});
    43|
    44|// Dashboard admin
    45|app.use('/admin', express.static(path.join(__dirname, 'admin')));
    46|app.get('/admin', (req, res) => res.redirect('/admin/'));
    47|
    48|// Racine → redirige vers admin
    49|app.get('/', (req, res) => res.redirect('/admin/'));
    50|
    51|// 404
    52|app.use((req, res) => res.status(404).json({ error: 'not_found' }));
    53|
    54|// Global error handler — prevents process crash from unhandled async rejections
    55|app.use((err, req, res, _next) => {
    56|  console.error('[server] Unhandled error:', err?.stack || err?.message || err);
    57|  res.status(500).json({ error: 'internal_server_error' });
    58|});
    59|
    60|app.listen(config.port, () => {
    61|  console.log(`[Cudrefin Chatbot] Serveur démarré sur http://localhost:${config.port}`);
    62|  console.log(`[Cudrefin Chatbot] Admin: http://localhost:${config.port}/admin/`);
    63|});
    64|