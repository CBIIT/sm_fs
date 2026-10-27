export const environment = {
  production: true,
  appVersion: require('../../package.json').version,
  HEARTBEAT_INTERVAL: 10000,
  DB_HEARTBEAT_INTERVAL: 20000,
  KILLSWITCH_INTERVAL: 300000,
  TECH_SUPPORT_EMAIL: 'NCII2ESupport@mail.nih.gov',
  apiBaseUrl: '',
  msalConfig: {
    auth: {
      clientId: '0ad31f45-5ea4-4030-a510-255cc14ff6ec',
      authority: 'https://login.microsoftonline.com/14b77578-9773-42d5-8507-251ca2dc2b06',
      redirectUri: '/fs/',
    }
  },
  apiConfig: {
    scopes: ['api://0ad31f45-5ea4-4030-a510-255cc14ff6ec/access'],
  },
};
