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
const request_every = 5; // minutes

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
        // Get the cached object from the database
        let oldObject = db.get('object').value();
        
        if (Object.keys(oldObject).length === 0 && oldObject.constructor === Object) {
            // Initialising fresh data with fresh map_date

            addProps(obj, new Date(), false);
            console.log('No db file found, creating one');
        } else if (oldObject['map'] === obj['map']) {
            // If the map is the same as saved in the json file
            // Then i need to transfer the map_date to the cached_obj

            addProps(obj, oldObject.map_date, false);
            console.log('Map didnt change while sleeping');
        } else {
            // If the map changed, then fill fresh data

            addProps(obj, new Date(), false);
            console.log('Map changed while sleeping');
        }

        // Update existing object
        db.update('object', () => obj)
            .write();
    }).catch(err => console.log(err));
    
    // Scraping req_every minutes after First Start
    setInterval(() => {
        console.log('\nScraping..');
        scrape(link).then(obj => {
            let cached_obj = db.get('object').value();

            console.log(cached_obj.map);
            console.log(obj.map);

            if (cached_obj.map !== obj.map) {
                console.log('\x1b[31m%s\x1b[0m', 'MAP CHANGED');
                addProps(obj, new Date(), true);
            } else {
                addProps(obj, cached_obj.map_date, false);
            }

            db.update('object', () => obj)
            .write();

        }).catch(err => console.log(err));
    }, request_every * 1000 * 60);
}

function  addProps(obj, map_date, isChanged) {
    obj.map_date = map_date;
    obj.isMapChanged = isChanged;
    return obj;
}