// Local developer environment — used by `npm run start-local` and `npm run start-apache`.
// When using start-apache, Apache serves the app at /fs/ and proxies all backend services.
// When using start-local, customize proxy targets in proxy.config.local-api.js.

export const environment = {
  production: false,
  appVersion: require('../../package.json').version,
  HEARTBEAT_INTERVAL: 10000,
  DB_HEARTBEAT_INTERVAL: 20000,
  KILLSWITCH_INTERVAL: 300000,
  TECH_SUPPORT_EMAIL: 'ncii2egrantsdevelopmentteam@mail.nih.gov',
  CONCEPT_ID_URL: "https://deaislprod.nci.nih.gov/cats/protected/concept/viewConcept.action?conceptId=",
  EGRANTS_URL: "https://egrants-web-dev.nci.nih.gov/Egrants/by_appl?appl_id=",
  GRANT_VIEWER_URL: "https://i2e-dev.nci.nih.gov/grantdetails/#/search?applId=",
  apiBaseUrl: window.location.origin,
  msalConfig: {
    auth: {
      clientId: '4450b02b-ea0d-4a8c-bf01-cbad66fb841c',
      authority: 'https://login.microsoftonline.com/14b77578-9773-42d5-8507-251ca2dc2b06',
      redirectUri: window.location.origin + '/fs/',
    }
  },
  apiConfig: {
    scopes: ['api://4450b02b-ea0d-4a8c-bf01-cbad66fb841c/access'],
  },
};
