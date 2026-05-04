/*
 * Copyright 2021 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. 
 */
import { ServerOptions } from './types/ServerOptions';

export default {
  
  // ==========================================================================
  // SECRET / AUTH — vem do env do Railway
  // ==========================================================================
  secretKey: process.env.SECRET_KEY || (() => {
  throw new Error('69647395');
})(),
host: process.env.HOST || 'https://wppconnect-server-production-dc28.up.railway.app',
port: process.env.PORT || '21465',
deviceName: 'AchadinhosBot',
poweredBy: 'AchadinhosBot',

tokenStoreType: 'memory',
startAllSession: false,
maxListeners: 50, 
  customUserDataDir: '/tmp/userDataDir/',

  // ==========================================================================
  // CORS
  // ==========================================================================
  cors: '*',

  // ==========================================================================
  // WEBHOOK — TUDO DESLIGADO (não usamos webhooks, economizamos RAM/CPU)
  // ==========================================================================
  webhook: {
    url: '',
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

  // ==========================================================================
  // WEBSOCKET
  // ==========================================================================
  websocket: {
    autoDownload: false,
    uploadS3: false,
  },

  // ==========================================================================
  // CHATWOOT — desligado
  // ==========================================================================
  chatwoot: {
    sendQrCode: false,
    sendStatus: false,
  },

  // ==========================================================================
  // ARCHIVE — desligado (economiza disco)
  // ==========================================================================
  archive: {
    enable: false,
    waitTime: 10,
    daysToArchive: 45,
  },

  // ==========================================================================
  // LOGS — só erros em produção
  // ==========================================================================
  log: {
  level: 'warn',
  logger: ['console'],
},

  // ==========================================================================
  // CREATE OPTIONS — Puppeteer/Chromium otimizado para Railway
  // ==========================================================================
  createOptions: {
  browserArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-zygote',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
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
    // 🆕 anti-detecção 2026
    '--disable-blink-features=AutomationControlled',
    //'--single-process', UNIFICAR TODO PROCESSO EM UM PROCESSO SÓ
  ],
  puppeteerOptions: {
    headless: 'new',
    protocolTimeout: 120000,
  },
  whatsappVersion: '2.3000.1023901801',  
  disableWelcome: true,
  updatesLog: false,
  autoClose: 60000, // 1 min — alinhado com polling do QR
  waitForLogin: true,
  logQR: false,
  tokenStore: 'memory',
  //folderNameToken: './tokens',
},

mapper: { enable: false, prefix: 'tagone-' },

  // ==========================================================================
  // DB — não usado (token store em arquivo)
  // ==========================================================================
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
