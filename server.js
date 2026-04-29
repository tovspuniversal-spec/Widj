import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getPrice(url) {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  await page.waitForSelector("body");

  const price = await page.evaluate(() => {
    const text = document.body.innerText;

    const matches = text.match(/[0-9]{2}\.[0-9]{2}/g);

    if (!matches) return null;

    const valid = matches
      .map(n => parseFloat(n))
      .filter(n => n > 30 && n < 80);

    if (!valid.length) return null;

    return valid[0];
  });

  await browser.close();

  if (!price) {
    throw new Error("Price not found");
  }

  return price;
}

app.get("/", (req, res) => {
  res.send("Fuel Puppeteer API 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const dieselUrl =
      "https://auto.ria.com/uk/topl
