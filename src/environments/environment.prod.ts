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
      clientId: '4450b02b-ea0d-4a8c-bf01-cbad66fb841c', // NONPROD — replace with prod client ID when available (August 2026)
      authority: 'https://login.microsoftonline.com/14b77578-9773-42d5-8507-251ca2dc2b06',
      redirectUri: '/fs/',
    }
  },
  apiConfig: {
    scopes: ['api://4450b02b-ea0d-4a8c-bf01-cbad66fb841c/access'],
  },
};
