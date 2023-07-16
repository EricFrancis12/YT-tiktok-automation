const axios = require('axios');

const xml2js = require('xml2js');
const parser = new xml2js.Parser();



const rssFeedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCwIol-PEI0ISjQvhBdVOgJw';

axios.get(rssFeedUrl)
    .then(response => {
        const data = response.data;

        parser.parseString(data, async (parseErr, result) => {
            if (parseErr) {
                console.err(parseErr);
                return;
            }

            console.log(result);
            console.log(result.feed.entry);
        });
    });




