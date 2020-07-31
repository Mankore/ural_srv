require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
var https = require("https");

// Mongoose testing
const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const dbm = mongoose.connection;
dbm.on("error", console.error.bind(console, "connection error:"));
dbm.once("open", function () {
  // we're connected!
  console.log("Connected to database");
});
// ------------------------

const { scrape, link } = require("./scrapper");

const app = express();

const SRV_PORT = 3000;
const request_every = 5; // minutes

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/info", async (req, res, next) => {
  let oldObj = await getOldObject('object');
  res.send(oldObj);
});

app.all("*", (req, res) => {
  res.send("Invalid request");
});

app.listen(process.env.PORT || SRV_PORT, () => {
  console.log(`App is listening on port: ${process.env.PORT || SRV_PORT}`);
  //setReqInterval(); // Это костыль
  initialize();
});


function initialize() {
  console.log("Initializing requests setInterval");
  // First start
  scrape(link)
    .then(async (obj) => {
      // Get the cached object from the database
      let oldObject = await getOldObject('object');

      if (Object.keys(oldObject).length === 0 && oldObject.constructor === Object) {
        // Initialising fresh data with fresh map_date

        addProps(obj, new Date(), false);
        console.log("No db file found, creating one");
      } else if (oldObject["map"] === obj["map"]) {
        // If the map is the same as saved in the json file
        // Then i need to transfer the map_date to the cached_obj

        addProps(obj, oldObject.map_date, false);
        console.log("Map didnt change while sleeping");
      } else {
        // If the map changed, then fill fresh data

        addProps(obj, new Date(), false);
        console.log("Map changed while sleeping");
      }

      // Update existing object
      await updateOldObject(obj, 'object');
    })
    .catch((err) => console.log(err));

  // Scraping req_every minutes after First Start
  setInterval(() => {
    console.log("\nScraping..");
    scrape(link)
      .then(async (obj) => {
        let cached_obj = await getOldObject('object');

        console.log(cached_obj.map);
        console.log(obj.map);

        if (cached_obj.map !== obj.map) {
          console.log("\x1b[31m%s\x1b[0m", "MAP CHANGED");
          addProps(obj, new Date(), true);
        } else {
          addProps(obj, cached_obj.map_date, false);
        }

        await updateOldObject(obj, 'object');
      })
      .catch((err) => console.log(err));
  }, request_every * 1000 * 60);
}

function addProps(obj, map_date, isChanged) {
  obj.map_date = map_date;
  obj.isMapChanged = isChanged;
  return obj;
}

const ownUrl = "https://ural-srv.herokuapp.com/";

function setReqInterval() {
  console.log("setting interval");
  setInterval(() => {
    console.log("Sending self-request");
    https.get(ownUrl, (res) => {
      res.setEncoding("utf8");
      res.on("data", function (chunk) {
        console.log(chunk);
      });
    });
  }, 29 * 60 * 1000); // every 29 minutes
}

async function getOldObject(collection) {
  return new Promise((resolve, reject) => {
    dbm.collection(collection).findOne({}, (err, json) => {
      if (err) {
        reject(err);
        throw err;
      } else {
        resolve(json);
      }
    });
  });
}

async function updateOldObject(newObject, collection) {
  return new Promise((resolve, reject) => {
    dbm.collection(collection).replaceOne({}, newObject, (err, res) => {
      if (err) {
        console.log(err);
        console.log("failed to update object");
        reject(err);
      } else {
        //console.log(res);
        console.log("updated Object");
        resolve(res);
      }
    });
  });
}

async function clearCollection(collection) {
  return new Promise((resolve, reject) => {
    dbm.collection(collection).deleteMany({}, (err, res) => {
      if (err) {
        console.log(err);
        console.log("failed to delete objects");
        reject(err);
      } else {
        //console.log(res);
        console.log("removed all objects");
        resolve(res);
      }
    });

  })
}

async function addItemToCollection(newObject, collection) {
  return new Promise((resolve, reject) => {
    dbm.collection(collection).insertOne(newObject, (err, res) => {
      if (err) {
        //console.log(err);
        console.log("failed to add object");
        reject(err);
      } else {
        //console.log(res);
        console.log("Added object to db");
        resolve(res);
      }
    });
  })
}
