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
      "https://auto.ria.com/uk/toplivo/dt/";

    const gasolineUrl =
      "https://auto.ria.com/uk/toplivo/a95/";

    const [diesel, gasoline] = await Promise.all([
      getPrice(dieselUrl),
      getPrice(gasolineUrl)
    ]);

    cache = {
      diesel: Number(diesel.toFixed(2)),
      gasoline: Number(gasoline.toFixed(2))
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "puppeteer parse error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
