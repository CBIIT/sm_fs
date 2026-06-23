export const environment = {
  production: false,
  appVersion: require('../../package.json').version,
  HEARTBEAT_INTERVAL: 10000,
  DB_HEARTBEAT_INTERVAL: 20000,
  KILLSWITCH_INTERVAL: 300000,
  TECH_SUPPORT_EMAIL: 'ncii2egrantsdevelopmentteam@mail.nih.gov',
  CONCEPT_ID_URL: "https://deaislprod.nci.nih.gov/cats/protected/concept/viewConcept.action?conceptId=",
  EGRANTS_URL: "https://egrants-web-dev.nci.nih.gov/Egrants/by_appl?appl_id=",
  GRANT_VIEWER_URL: "https://i2e-dev.nci.nih.gov/yourgrants/jsp/GrantDetails.jsp?applId=",
  URL_YOURGRANTS: "https://i2e-dev.nci.nih.gov/yourgrants/GrantView",
  apiBaseUrl: '',
  msalConfig: {
    auth: {
      clientId: '4450b02b-ea0d-4a8c-bf01-cbad66fb841c',
      authority: 'https://login.microsoftonline.com/14b77578-9773-42d5-8507-251ca2dc2b06',
      redirectUri: window.location.origin,
    }
  },
  apiConfig: {
    scopes: ['api://4450b02b-ea0d-4a8c-bf01-cbad66fb841c/access'],
  },
};
