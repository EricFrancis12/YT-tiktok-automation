const fs = require('fs');



const brands = [];

const brandsFolderContents = fs.readdirSync('./config/rss/brands');
brandsFolderContents.forEach(item => {
    const stats = fs.statSync(`./config/rss/brands/${item}`);
    if (stats.isDirectory && item !== 'brands.js' && item !== 'brandsJSON.js') {
        //const files = fs.readdirSync(`./brands/${item}`);

        try {
            const result = require(`./${item}/${item}.js`);
            brands.push(result);
        } catch (err) {
            console.error(err);
        }
    }
});



module.exports = brands;