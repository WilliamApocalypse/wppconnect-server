// ============================================================================
// WPPConnect Server — config.ts OTIMIZADO para AchadinhosBot
// ============================================================================
// Aplicar no fork do wppconnect-server no Railway, em src/config.ts
//
// MUDANÇAS CRÍTICAS vs config anterior:
// 1. customUserDataDir → /tmp/userDataDir/  (tmpfs, limpa em restart)
// 2. Todos os 9 webhook listeners → false  (não usamos webhook, só polling)
// 3. Flags Puppeteer anti-leak adicionadas
// 4. tokenStoreType: 'file' (mantém), mas com cleanup no Dockerfile
// ============================================================================

import { ServerOptions } from './types/ServerOptions';

export default {
  secretKey: process.env.SECRET_KEY || 'THISISMYSECURETOKEN',
  host: 'http://localhost',
  port: process.env.PORT || '21465',
  deviceName: 'AchadinhosBot',
  poweredBy: 'AchadinhosBot',

  // ── Storage de tokens ─────────────────────────────────────────────────────
  // Mantemos 'file' para sobreviver a restarts curtos, MAS o Dockerfile
  // limpa tokens órfãos no boot pra não vazar sessões mortas.
  tokenStoreType: 'file',

  // ── Inicialização ─────────────────────────────────────────────────────────
  startAllSession: false, // CRÍTICO: nunca recriar todas as sessões no boot
  maxListeners: 30,

  // ── Webhook DESLIGADO ─────────────────────────────────────────────────────
  // Nosso sistema usa POLLING via Edge Functions, não webhook.
  // Cada listener ativo consome CPU/RAM por sessão. Desligando todos
  // economizamos ~30-40% de RAM por sessão ativa.
  webhook: {
    url: null,
    autoDownload: false,
    uploadS3: false,
    readMessage: false,
    allUnreadOnStart: false,
    listenAcks: false,
    onPresenceChanged: false,
    onParticipantsChanged: false,
    onReactionMessage: false,
    onPollResponse: false,
    onRevokedMessage: false,
    onLabelUpdated: false,
    onSelfMessage: false,
    ignore: ['status@broadcast'],
  },

  // ── Storage S3 (não usamos) ───────────────────────────────────────────────
  archive: {
    enable: false,
    waitTime: 10,
    daysToArchive: 45,
  },

  log: {
    level: 'info',
    logger: ['console'],
  },

  createOptions: {
    browserArgs: [
      // ─── ESSENCIAIS para Docker/Railway ───────────────────────────────────
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // usa /tmp em vez de /dev/shm (limitado em Docker)

      // ─── Anti-leak / estabilidade ─────────────────────────────────────────
      '--no-zygote',                                          // evita processo zygote vazado
      '--disable-features=IsolateOrigins,site-per-process',   // reduz nº de processos filhos
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-ipc-flooding-protection',

      // ─── Performance / RAM ────────────────────────────────────────────────
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',

      // NOTA: --single-process foi DELIBERADAMENTE OMITIDO.
      // Em produção é arriscado: qualquer crash de aba derruba o servidor
      // inteiro. Os flags acima já resolvem o vazamento sem esse risco.
    ],

    // ── userDataDir em tmpfs ─────────────────────────────────────────────
    // Antes: './userDataDir/' → escrevia no disco persistente do Railway,
    // acumulava GBs e travava. Agora: /tmp é tmpfs (RAM-backed), limpa
    // automaticamente em restart e tem performance muito superior.
    puppeteerOptions: {
      headless: 'new',
      userDataDir: '/tmp/userDataDir/',
    },

    disableWelcome: true,
    updatesLog: false,
    autoClose: 60000,    // fecha browser se QR não escaneado em 60s
    tokenStore: 'file',
    folderNameToken: './tokens',
  },

  mapper: {
    enable: false,
    prefix: 'tagone-',
  },

  db: {
    mongodbDatabase: 'tokens',
    mongodbCollection: '',
    mongodbUser: '',
    mongodbPassword: '',
    mongodbHost: '',
    mongoIsRemote: true,
    mongoURLRemote: '',
    mongodbPort: 27017,
    redisHost: 'localhost',
    redisPort: 6379,
    redisPassword: '',
    redisDb: 0,
    redisPrefix: 'docker',
  },
} as unknown as ServerOptions;
