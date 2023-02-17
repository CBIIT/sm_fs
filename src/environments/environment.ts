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
  CONCEPT_ID_URL: "https://deaislprod.nci.nih.gov/cats/protected/concept/viewConcept.action?conceptId=",
  EGRANTS_URL: "https://egrants-web-dev.nci.nih.gov/Egrants/by_appl?appl_id=",
  GRANT_VIEWER_URL: "https://i2e-dev.nci.nih.gov/yourgrants/jsp/GrantDetails.jsp?applId=",
  I2EWEB_URL: "https://i2e-dev.nci.nih.gov/",
  URL_YOURGRANTS: "https://i2e-dev.nci.nih.gov/yourgrants/GrantView",
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
