# Running the package-scrape script


- install LibreOffice the default location should be C:\Program Files\LibreOffice.  If not, you'll need to update **LibreOfficeLocation** in PdfFileConverterServiceImpl.
- create C:/egrants/PFR/package and C:/egrants/PFR/funding_plan folders
- Make sure you have C:/temp and a /temp folder in your tomcat directory
- Build and deploy the latest version of the v1.0.7_fs branch of the web service locally (this is only necessary because later branches have DB changes that are not yet in prod.)
- update the HOST variable in package-scrape.js to point to your localhost and port: example const HOST = 'localhost:8080';
- update the TIMEOUT variable to control the delay between network calls. Right now, it's set at 15 seconds.
- execute the package-scrape.js script.
- The script will process the list of request and plan ids, and will create a file called urls.json to track results. If you stop the script for any reason, you can just start over and the script will continue from where it left off.
- To start over completely, delete this file. It will get recreated as necessary.