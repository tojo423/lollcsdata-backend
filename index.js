const express = require("express");
const morgan = require("morgan");
const puppeteer = require("puppeteer");
var cors = require("cors");

const app = express();

global.htmlCache = {};

const delay = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};

function getOrCreateCacheObj(leagueSlug, tournamentSlug, stageSlug) {
  const htmlCache = global.htmlCache;
  const cacheKey = leagueSlug + tournamentSlug + stageSlug;

  const existingObject = htmlCache[cacheKey];
  if (existingObject) {
    return existingObject;
  }

  htmlCache[cacheKey] = {};
  return htmlCache[cacheKey];
}

async function fetchStandingsHtml(leagueSlug, tournamentSlug, stageSlug) {
  const url = `https://lolesports.com/standings/${leagueSlug}/${tournamentSlug}/${stageSlug}`;
  console.log(url);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(url);
  await delay();
  await page.waitForSelector(".StandingsBracketV2");
  await delay();
  const html = await page.$eval(".StandingsBracketV2", (element) => {
    return element.parentElement.innerHTML;
  });
  console.log("html", html);
  await browser.close();
  return html;
}

app.use(morgan("tiny"));
app.use(cors());

app.get("/", (req, res) => {
  res.send("<h1>Working!</h1>");
});

app.get("/standingsHtml", async (req, res) => {
  try {
    const { leagueSlug, tournamentSlug, stageSlug } = req.query;
    console.log("tournamentSlug:", tournamentSlug, "stageSlug:", stageSlug);

    const cacheObj = getOrCreateCacheObj(tournamentSlug, stageSlug);

    if (cacheObj.html) {
      const elapsedTime = Date.now() - cacheObj.time;
      const hours = 6;
      const minutes = hours * 60;
      const seconds = minutes * 60;
      const ms = seconds * 1000;
      if (elapsedTime > ms) {
        const fetchedHtml = await fetchStandingsHtml(
          leagueSlug,
          tournamentSlug,
          stageSlug
        );
        cacheObj.html = fetchedHtml;
        cacheObj.time = Date.now();
        res.send(fetchedHtml);
      } else {
        res.send(cacheObj.html);
      }
    } else {
      const fetchedHtml = await fetchStandingsHtml(
        leagueSlug,
        tournamentSlug,
        stageSlug
      );
      cacheObj.html = fetchedHtml;
      cacheObj.time = Date.now();
      res.send(fetchedHtml);
    }
  } catch (err) {
    res.send(`<div>${err}</div>`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});
