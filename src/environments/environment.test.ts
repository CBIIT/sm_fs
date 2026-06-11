// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  appVersion: require('../../package.json').version,
  HEARTBEAT_INTERVAL: 10000,
  DB_HEARTBEAT_INTERVAL: 20000,
  KILLSWITCH_INTERVAL: 300000,
  TECH_SUPPORT_EMAIL: 'ncii2egrantsdevelopmentteam@mail.nih.gov',
  GRANT_VIEWER_URL: 'https://i2e-test.nci.nih.gov/yourgrants/jsp/GrantDetails.jsp?applId=',
  I2EWEB_URL: 'https://i2e-test.nci.nih.gov/',
  URL_YOURGRANTS: 'https://i2e-test.nci.nih.gov/yourgrants/GrantView',
  apiBaseUrl: '',
  msalConfig: {
    auth: {
      clientId: '4450b02b-ea0d-4a8c-bf01-cbad66fb841c',
      authority: 'https://login.microsoftonline.com/14b77578-9773-42d5-8507-251ca2dc2b06',
      redirectUri: '/fs/',
    }
  },
  apiConfig: {
    scopes: ['api://4450b02b-ea0d-4a8c-bf01-cbad66fb841c/access'],
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
