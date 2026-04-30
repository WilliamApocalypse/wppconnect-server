import { ServerOptions } from './types/ServerOptions';

export default {
  secretKey: process.env.SECRET_KEY || '696473',
  host: 'http://0.0.0.0',
  port: process.env.PORT || '21465',
  deviceName: 'WppConnect',
  poweredBy: 'WPPConnect-Server',

  // ⚠️ CRÍTICO: NÃO subir todas sessões automaticamente
  startAllSession: false,

  // ⚠️ Se possível trocar para redis futuramente
  tokenStoreType: 'file',

  maxListeners: 50,

  customUserDataDir: './userDataDir/',

  webhook: {
    url: null,
    autoDownload: true,
    uploadS3: false,
    readMessage: true,
    allUnreadOnStart: false,
    listenAcks: true,
    onPresenceChanged: true,
    onParticipantsChanged: true,
    onReactionMessage: true,
    onPollResponse: true,
    onRevokedMessage: true,
    onLabelUpdated: true,
    onSelfMessage: false,
    ignore: ['status@broadcast'],
  },

  websocket: {
    autoDownload: false,
    uploadS3: false,
  },

  chatwoot: {
    sendQrCode: true,
    sendStatus: true,
  },

  archive: {
    enable: false,
    waitTime: 10,
    daysToArchive: 45,
  },

  log: {
    level: 'error', // menos ruído
    logger: ['console'],
  },

  createOptions: {
    // 🔥 PRINCIPAL OTIMIZAÇÃO DO CHROME
    puppeteerOptions: {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--ignore-certificate-errors',
      ],
    },

    // Mantém compatibilidade
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],

    linkPreviewApiServers: null,
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

    // ⚠️ FUTURO: usar redis melhora MUITO estabilidade
    redisHost: 'localhost',
    redisPort: 6379,
    redisPassword: '',
    redisDb: 0,
    redisPrefix: 'wpp',
  },

  aws_s3: {
    region: 'sa-east-1' as any,
    access_key_id: null,
    secret_key: null,
    defaultBucketName: null,
    endpoint: null,
    forcePathStyle: null,
  },
} as unknown as ServerOptions;
