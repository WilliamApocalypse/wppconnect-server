secretKey: process.env.SECRET_KEY || (() => {
  throw new Error('696473');
})(),
host: process.env.HOST || 'https://wppconnect-server-production-dc28.up.railway.app',
port: process.env.PORT || '21465',
deviceName: 'AchadinhosBot',
poweredBy: 'AchadinhosBot',

tokenStoreType: 'file',
startAllSession: false,
maxListeners: 15,

// ... webhook igual ...
// ... archive igual ...

log: {
  level: 'warn',
  logger: ['console'],
},

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
  ],
  puppeteerOptions: {
    headless: 'new',
    userDataDir: '/tmp/userDataDir/',
  },
  disableWelcome: true,
  updatesLog: false,
  autoClose: 120000, // 2 min — alinhado com polling do QR
  waitForLogin: true,
  logQR: false,
  tokenStore: 'file',
  folderNameToken: './tokens',
},

mapper: { enable: false, prefix: 'tagone-' },

// 🗑️ bloco db: removido (não é usado com tokenStoreType: 'file')
