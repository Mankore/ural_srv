const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Lowdb testing
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Initialise default fields for lowdb
db.defaults({object: {}}).write();
// ------------------------

const { scrape, link } = require('./scrapper');

const app = express();

const SRV_PORT = 3000;
const request_every = 0.2; // minutes

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let cached_obj;
let map_date;

app.get('/info', (req, res, next) => {
    res.send(db.get('object').value());
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
        let oldObject = db.get('object').value();
        
        cached_obj = obj;
        if (Object.keys(oldObject).length === 0 && oldObject.constructor === Object) {
            // Initialising fresh data with fresh map_date
            map_date = new Date();
            cached_obj['map_date'] = map_date;
            cached_obj['isMapChanged'] = false;
            console.log('First init');
            
        } else if (oldObject['map'] === obj['map']) {
            // If the map is the same as saved in the json file
            // Then i need to transfer the map_date to the cahced_obj
            map_date = oldObject['map_date'];
            cached_obj['map_date'] = map_date;
            cached_obj['isMapChanged'] = false;
            console.log('Map didnt change while in sleep');
        } else {
            // If the map changed, then fill fresh data
            map_date = new Date();
            cached_obj['map_date'] = map_date;
            cached_obj['isMapChanged'] = false;
            console.log('Second init');
            console.log('Map changed');
        }


        db.update('object', () => cached_obj)
            .write();
    }).catch(err => console.log(err));
    
    // Scraping req_every minutes after First Start
    setInterval(() => {
        console.log('\nScraping..');
        scrape(link).then(obj => {
            cached_obj = db.get('object').value();
            console.log(cached_obj.map);
            console.log(obj.map);

            console.log(cached_obj);
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
            console.log(cached_obj);

            db.update('object', () => cached_obj)
            .write();

        }).catch(err => console.log(err));
    }, request_every * 1000 * 60);
}
