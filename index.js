require('dotenv').config();

const fs = require('fs');
const queryString = require('querystring');

const axios = require('axios');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const ytdl = require('ytdl-core');

const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const brands = require('./config/rss/brands/brands');
const utils = require('./utils/utils');

const downloadQueue = require('./queues/downloadQueue.json');
const uploadQueue = require('./queues/uploadQueue.json');
const { time } = require('console');





function main() {
    brands.forEach(brand => {
        brand.sources.YT.forEach(channel => {
            const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channel_id}`;
            getnewItems(rssFeedUrl, channel, brand);
        });
    });

    // randomly set up next pass, so YouTube is less likely to detect pattern:
    const baseTimeout = oneHour;
    const minTimeout = oneHour / 2;

    let timeout = Math.random().toFixed(2) * baseTimeout;
    if (!utils.isEmpty(minTimeout) && minTimeout > timeout) timeout += minTimeout;

    console.log(timeout);
    setTimeout(main, timeout);
}

const oneHour = 1000 * 60 * 60;



function getnewItems(rssFeedUrl, channel, brand) {
    axios.get(rssFeedUrl)
        .then(response => {
            const data = response.data;

            parser.parseString(data, async (parseErr, result) => {
                if (parseErr) {
                    console.error(parseErr);
                    return;
                }

                const brandJSON = require(`./config/rss/brands/${brand.name}/${brand.name}.json`);

                if (!brandJSON.outputArr || !utils.isArray(brandJSON.outputArr)) {
                    // save brand.json file as default format
                    const defaultBrandJSON = { name: brand.name, outputArr: [] };
                    fs.writeFileSync(`./config/rss/brands/${brand.name}/${brand.name}.json`, JSON.stringify(defaultBrandJSON, null, 4));
                    return;
                }

                for (let j = 0; j < result.feed.entry.length; j++) {
                    const v = result.feed.entry[j]['yt:videoId'][0];

                    // if not in the download queue:
                    if (!utils.arrHasAnElementWithGivenKeyAndGivenValue(downloadQueue, 'v', v)) {
                        // push current itteration to download queue:
                        const queueItem = {
                            v,
                            url: `https://youtube.com/watch?v=${result.feed.entry[j]['yt:videoId'][0]}`,
                            title: result.feed.entry[j].title[0],
                            channel,
                            published: result.feed.entry[j].published[0],
                            brand
                        }

                        downloadQueue.push(queueItem);
                    }
                }

                // save downloadQueue:
                console.log('Saving donwloadQueue');
                fs.writeFileSync('./queues/downloadQueue.json', JSON.stringify(downloadQueue, null, 4));

                handleDownloadQueue();
            });
        });
}



let handlingDownloadQueue = false;
function handleDownloadQueue() {
    const date = utils.formatDate(Date.now());
    console.log(date + ' -- running handleDownloadQueue()');
    if (downloadQueue.length === 0 || handlingDownloadQueue) return;

    handlingDownloadQueue = true;

    const dir = `./tmp`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const outputPath = `${dir}/${downloadQueue[0].v}.mp4`;
    if (fs.existsSync(outputPath)) {
        downloadQueue.shift();
        handlingDownloadQueue = false;
        return;
    }



    // randomly set up next call:
    const baseTimeout = 75_000;
    const minTimeout = 45_000;

    let timeout = Math.random().toFixed(2) * baseTimeout;
    if (!utils.isEmpty(minTimeout) && minTimeout > timeout) timeout += minTimeout;

    console.log(timeout);
    setTimeout(() => {
        try {
            console.log(`***** starting download: ${outputPath}`);
            ytdl(downloadQueue[0].url, { quality: '22' })
                .pipe(fs.createWriteStream(outputPath))
                .on('close', () => {
                    const item = downloadQueue.shift();

                    const timestamp = Date.now();
                    const timestampFormated = utils.formatDate(timestamp);

                    const pathTo_brandJSON = `./config/rss/brands/${item.brand.name}/${item.brand.name}.json`;
                    const brandJSON = require(pathTo_brandJSON);

                    if (!brandJSON) brandJSON = { name: item.brand.name, outputArr: [] };
                    if (!brandJSON.outputArr) brandJSON.outputArr = [];

                    const queueItem = {
                        v: item.v,
                        url: item.url,
                        title: item.title,
                        channel: item.channel,
                        published: item.published,
                        brand: item.brand,
                        timestamp,
                        timestampFormated,
                        outputPath
                    };

                    brandJSON.outputArr.push(queueItem);
                    fs.writeFileSync(pathTo_brandJSON, JSON.stringify(brandJSON, null, 4));

                    uploadQueue.push(queueItem);
                    fs.writeFileSync('./queues/uploadQueue.json', JSON.stringify(uploadQueue, null, 4));

                    handlingDownloadQueue = false;

                    handleQueue();

                    console.log(`***** download completed: ${outputPath}`);
                    console.log('current downloadQueue length: ' + downloadQueue.length);
                });

        } catch (err) {
            console.error(err);
        }
    }, timeout);
}



let handlingUploadQueue = false;
function handleUploadQueue() {
    const date = utils.formatDate(Date.now());
    console.log(date + ' -- running handleUploadQueue()');
    if (uploadQueue.length === 0 || handlingUploadQueue) return;

    handlingUploadQueue = true;



    // randomly set up next call:
    const baseTimeout = 75_000;
    const minTimeout = 45_000;

    let timeout = Math.random().toFixed(2) * baseTimeout;
    if (!utils.isEmpty(minTimeout) && minTimeout > timeout) timeout += minTimeout;

    console.log(timeout);
    setTimeout(async () => {
        try {
            const outputPath = uploadQueue[0].outputPath;
            const code = require(`./config/rss/brands/${uploadQueue[0].brand.name}/${uploadQueue[0].brand.name}.js`).auth.TT.code;

            console.log(`***** starting upload: ${outputPath}`);

            const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache'
                },
                method: 'POST',
                body: queryString.stringify({
                    client_key: process.env.TIKTOK_API_CLIENT_KEY,
                    client_secret: process.env.TIKTOK_API_CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: 'https://tiktok-api-test.onrender.com/login/callback/'
                })
            });
            const resJSON = await response.json();
            console.log(resJSON);

        } catch (err) {
            console.error(err);
        }

        handlingUploadQueue = false;
        handleQueue();
        
    }, timeout);
}



function handleQueue() {
    handleDownloadQueue();
    //handleUploadQueue();
}





main();
handleQueue();
