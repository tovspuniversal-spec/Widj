import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getPrice(url, keyword) {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
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

  const text = await page.evaluate(() =>
    document.body.innerText
  );

  await browser.close();

  const matches = text.match(/[0-9]{2}\.[0-9]{2}/g);

  if (!matches) return null;

  const nums = matches.map(n => parseFloat(n));

  const filtered = nums.filter(
    n => n > 30 && n < 80
  );

  if (!filtered.length) return null;

  return (
    filtered.reduce((a, b) => a + b, 0) /
    filtered.length
  );
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
      getPrice(dieselUrl, "дизель"),
      getPrice(gasolineUrl, "а-95")
    ]);

    cache = {
      diesel: Number(diesel.toFixed(2)),
      gasoline: Number(gasoline.toFixed(2))
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error(err);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "puppeteer parse error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
