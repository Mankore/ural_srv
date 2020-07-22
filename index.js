const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { scrape, link } = require('./scrapper');

const app = express();

const SRV_PORT = 3000;
const request_every = 5; // minutes

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let cached_obj;
let map_date;

app.get('/info', (req, res, next) => {
    res.send(cached_obj);
});

app.all('*', (req, res) => {
    res.send('Invalid request');
});

app.listen(process.env.PORT || SRV_PORT, () => {
    console.log(`App is listening on port: ${process.env.PORT || SRV_PORT}`);
});

initialize();

function initialize() {
    console.log('Initializing requests setInterval');
    // First start
    scrape(link).then(obj => {
        cached_obj = obj;
        map_date = new Date();
        cached_obj['map_date'] = map_date;
        cached_obj['isMapChanged'] = false;
    }).catch(err => console.log(err));
    
    // Scraping req_every minutes after First Start
    setInterval(() => {
        console.log('\nScraping..');
        scrape(link).then(obj => {
            console.log(cached_obj.map);
            console.log(obj.map);

            if (cached_obj['map'] !== obj['map']) {
                console.log('\x1b[31m%s\x1b[0m', 'MAP CHANGED');

                cached_obj = obj;
                map_date = new Date();
                cached_obj['map_date'] = map_date;
                cached_obj['isMapChanged'] = true;
            } else {
                cached_obj = obj;
                cached_obj['map_date'] = map_date;
                cached_obj['isMapChanged'] = false;
            }
        }).catch(err => console.log(err));
    }, request_every * 1000 * 60);
}
