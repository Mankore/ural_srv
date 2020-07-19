const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { scrape, link } = require('./scrapper');

const app = express();

const SRV_PORT = 3000;
const request_every = 4; // minutes

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let req_date, last_req_date, cached_obj;

app.use('/info', (req, res, next) => {
    // If it is a first request after restart
    // Define last request date
    if (!last_req_date) {
        last_req_date = new Date();
        res.locals.approved = true;
    } else {
        // Date of a new request
        req_date = new Date();
        // If it is a new request under a ${request_every} minutes
        // Then send a cached object
        if (req_date - last_req_date < request_every * 60000) {
            // console.log('send cached obj');
            res.locals.approved = false;
        } else {
            // console.log('send a new request');
            // Replace a last_req_date with the latest(new) date
            last_req_date = req_date;
            res.locals.approved = true;
        }
    }

    next();
})

app.get('/info', (req, res) => {
    // If Approved, then send a new request
    // Else send cached object
    if (res.locals.approved) {
        scrape(link).then(obj => {
            cached_obj = obj;
            res.send(obj);
        });
    } else {
        res.send(cached_obj);
    }
});

// app.get('/info', (req, res, next) => {
//     res.send(cached_obj);
// })

app.all('*', (req, res) => {
    res.send('Invalid request');
});

app.listen(process.env.PORT || SRV_PORT, () => {
    console.log(`App is listening on port: ${process.env.PORT}`);
});

// setInterval(() => {
//     console.log('Scraping..');
//     scrape(link).then(obj => {
//         cached_obj = obj;
//     }).catch(err => console.log(err));
// }, request_every * 1000 * 60);