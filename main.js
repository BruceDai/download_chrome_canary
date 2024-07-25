const { Client } = require('node-scp')
const Downloader = require("nodejs-file-downloader");
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const lastestOfflineChromiumBuildUrl = "https://www.iplaysoft.com/tools/chrome/"; // "https://chromiumdash.appspot.com/releases"


const downloadBuild = async (buildUrl, platform, channel) => {
    const saveDir = path.join(path.dirname(process.argv[1]), 'builds', platform, channel);

    const nameArray = new URL(buildUrl).pathname.split('/');
    const localBuild = path.join(saveDir, nameArray[nameArray.length-1]);

    if (!fs.existsSync(localBuild)) {
        const downloader = new Downloader({
            url: buildUrl,
            directory: saveDir,
            timeout: 30000,
            proxy: ""
        });

        try {
            const {filePath, downloadStatus} = await downloader.download();
            console.log(`[${downloadStatus}] Download ${filePath} `);
            if (downloadStatus === 'COMPLETE') {
                const client = await Client({
                    host: '',
                    port: 99,
                    username: '',
                    password: '',
                })
                const fileName = path.basename(filePath);
                await client.uploadFile(
                    filePath,
                    `/home/webnn/project/chrome/canary/win64/${fileName}`
                );
                console.log(`[SUCCESS] Upload ${filePath} onto Powerbuilder Server`);
                client.close();
            }
        } catch (error) {
            console.log(error);
        }
    } else {
        console.log(`Already existed ${localBuild}. Skip download this round`)
    }
};

const downloadChrome = async (platform, channel, bits) => {
    const executablePath = path.join("C:\\Program Files\\Google\\Chrome\\Application", "chrome.exe");

    const browser = await puppeteer.launch({
        executablePath,
        headless: false,
        ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(100000);

    await page.goto(lastestOfflineChromiumBuildUrl, {timeout: 600000, waitUntil: 'domcontentloaded'});
    await page.waitForSelector('div.fc-dialog-container', {timeout: 10000});
    await page.$eval("button[aria-label ='Consent']", elem => elem.click());

    const segmentHandleArray = await page.$$('div.column > div.ui.segment');

    for (const segmentHandle of segmentHandleArray) {
        const text = await segmentHandle.evaluate(div => div.textContent);
        if (text.includes(`${platform} ${channel} ${bits} 位`)) {
            const herfs = await segmentHandle.$$eval('div.ui.buttons > a', anchors => [].map.call(anchors, a => a.href));
            await downloadBuild(herfs[0], platform, channel);
        }
    }

    browser.close();
}

downloadChrome('Windows', '金丝雀版', 64);