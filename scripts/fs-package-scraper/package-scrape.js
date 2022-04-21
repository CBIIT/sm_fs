const https = require('https');
const http = require('http');
const fs = require('fs');

// TODO: add command line parameters to control behavior, host, and url file settings

//const HOST = 'ncias-p1996-v:38080';
const HOST = 'localhost:8080';
const TIMEOUT = 20000;
const URL_FILE = 'urls.json';

const options = {
    headers: {
        SM_USER: 'WOLFREYC',
        Accept: 'application/json, text/plain, */*',
        Connection: 'keep-alive',
    },
};

// renameFiles();

let urlList = loadUrlList();
if (!urlList || urlList.length === 0) {
    buildUrlList();
    urlList = loadUrlList();
}

const filterClause = (e) => !e.success;

console.log(
    `Total URLs to process: ${urlList.filter(filterClause).length}`
);

urlList
    .filter(filterClause)
    .forEach((u, index) => {
        setTimeout(() => {
            scrape(u.url, u.fileName);
        }, index * TIMEOUT);
    });

function scrape(url, fileName) {
    const req = http.get(url, options, (res) => {
        if (res.statusCode === 200) {
            //const writeableStream = fs.createWriteStream(fileName);

            // res.on('data', (d) => {
            //     writeableStream.write(Buffer.from(d));
            // });

            // res.on('end', () => {
                // writeableStream.end();
                updateUrlStatus(url, true);
                console.log(`[SUCCESS][${url}]`);
            // });
        } else {
            console.log(`[FAILURE][${url}]`);
            updateUrlStatus(
                url,
                false,
                `[${res.statusCode}][${res.statusMessage}]`
            );
        }
    });

    req.on('error', (error) => {
        console.error(`Error: ${error}`);
    });

    req.end();
}

function getRequestURL(frqId, applId, fprId, type) {
    const requestUrl = `http://${HOST}/i2ecws/api/v1/documents/funding-requests-send-package/${frqId}/${applId}`;
    const planUrl = `http://${HOST}/i2ecws/api/v1/documents/funding-plan-send-package/?fpId=${fprId}&applIds=${applId}`;
    return type === 'PLAN' ? planUrl : requestUrl;
}

function getFileName(frqId, applId, fprId, type, supplement) {
    const suppl = supplement ? 'SUPP_' : '';
    return type === 'PLAN'
        ? `/egrants/PFR/funding_plan/PKG_FP_${fprId}.PDF`
        : `/egrants/PFR/package/${suppl}PKG_${applId}_${frqId}.PDF`;
}

function buildUrlList() {
    const requestData = fs.readFileSync('request_ids.json').toString();
    const planData = fs.readFileSync('plan_ids.json');

    let requests = JSON.parse(requestData);
    let rawPlans = JSON.parse(planData);
    const planMap = new Map();
    rawPlans.forEach((p) => {
        let applIds = planMap.get(p.fprId);
        if (!applIds) {
            planMap.set(p.fprId, [p.applId]);
        } else {
            applIds.push(p.applId);
            planMap.set(p.fprId, applIds);
        }
    });

    const urlList = [];
    requestIds = [];
    requests.forEach((r) => {
        if (!requestIds.includes(r.frqId)) {
            requestIds.push(r.frqId);
            urlList.push({
                url: getRequestURL(r.frqId, r.applId, r.fprId, 'REQUEST'),
                fileName: getFileName(r.frqId, r.applId, r.fprId, 'REQUEST', r.supplement),
                type: 'REQUEST',
                success: false,
                error: null,
            });
        } else {
            console.error(`Duplicate frqId found: ${r.frqId}`);
        }
    });

    planMap.forEach((v, k) => {
        urlList.push({
            url: getRequestURL(null, v, k, 'PLAN'),
            fileName: getFileName(null, v, k, 'PLAN', null),
            type: 'PLAN',
            success: false,
            error: null,
        });
    });
    saveUrlList(urlList);
}

function saveUrlList(urlList) {
    fs.writeFileSync(`${URL_FILE}`, JSON.stringify(urlList));
}

function loadUrlList() {
    if (fs.existsSync(`${URL_FILE}`)) {
        const urls = fs.readFileSync(`${URL_FILE}`).toString();
        return urls ? JSON.parse(urls) : null;
    }
    return null;
}

function updateUrlStatus(url, status, error = null) {
    const el = urlList.find((e) => e.url === url);
    const elIndex = urlList.findIndex((e) => e.url === url);
    el.success = status;
    el.error = error;

    saveUrlList(urlList);
}

function renameFiles() {
    const urlList = loadUrlList();
    urlList.forEach(u => {
        console.log(`Old: ${u.fileName}`);
        if(u.type === 'REQUEST' ) {
            u.fileName = 'request/' + getNewRequestFileName(u.fileName.split('/')[1]);
        } else if(u.type === 'PLAN') {
            u.fileName = 'plan/' + getNewPlanFileName(u.fileName.split('/')[1]);
        }
        console.log(`New: ${u.fileName}`);
    });

    saveUrlList(urlList);
    // directory path
    const dir = './request/';

    // list all files in the directory
    fs.readdir(dir, (err, files) => {
        if (err) {
            throw err;
        }

        // files object contains all files names
        // log them on console
        files.forEach((file) => {
            if (file.startsWith('Package')) {
                console.log(`rename ${file}`);
                const newName = getNewRequestFileName(file);
                fs.rename(dir + file, dir + newName, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        });
    });
}

function getNewRequestFileName(oldFileName) {
    if(oldFileName.startsWith('PKG')) {
        return oldFileName;
    }
    const fileName = oldFileName.split('.')[0];
    const fileParts = fileName.split('_');
    return `PKG_${fileParts[2]}_${fileParts[1]}.PDF`;
}

function getNewPlanFileName(oldFileName) {
    if(oldFileName.startsWith('PKG_FP')) {
        return oldFileName;
    }
    const fileName = oldFileName.split('.')[0]
    const fileParts = fileName.split('_');

    return `PKG_FP_${fileParts[1]}.PDF`;   
}