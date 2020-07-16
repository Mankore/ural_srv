const puppeteer = require('puppeteer');

const stats_link = 'https://www.gametracker.com/server_info/109.120.135.78:2302/';

function clearString(str) {
    str = str.replace(/\n/g, '');
    return str.replace(/\t/g, '');
}

async function getElemText(page, xPath, prop) {
    const [el] = await page.$x(xPath);
    const src = await el.getProperty(prop);
    return await src.jsonValue();
}

async function getPlayers(page, player_num) {
    let players = [];

    if (player_num >= 10) {
        for (let i = 0; i < 10; i++) {
            const name = clearString(await getElemText(page, `//*[@id="HTML_online_players"]/div/table/tbody/tr[${i+2}]/td[2]/a`, 'textContent'));
            const score = clearString(await getElemText(page, `//*[@id="HTML_online_players"]/div/table/tbody/tr[${i+2}]/td[3]`, 'textContent'));
            players = [...players, {name, score}];
        }
    } else {
        for (let i = 0; i < player_num; i++) {
            const name = clearString(await getElemText(page, `//*[@id="HTML_online_players"]/div/table/tbody/tr[${i+2}]/td[2]/a`, 'textContent'));
            const score = clearString(await getElemText(page, `//*[@id="HTML_online_players"]/div/table/tbody/tr[${i+2}]/td[3]`, 'textContent'));
            players = [...players, {name, score}];
        }
    }

    return players;
}

async function scrape(url) {
    const browser = await puppeteer.launch({
        args : [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
    const page = await browser.newPage();
    await page.goto(url);

    const player_num = await getElemText(page, '/html/body/div[2]/div[7]/div[1]/div[3]/span[2]', 'textContent');
    const player_total = await getElemText(page, '//*[@id="HTML_max_players"]', 'textContent');
    const map = clearString(await getElemText(page, '//*[@id="HTML_curr_map"]', 'textContent'));

    const players = await getPlayers(page, player_num);
    const date = new Date();

    browser.close();
    return {player_num, player_total, map, date, players};
}

exports.scrape = scrape;
exports.link = stats_link;