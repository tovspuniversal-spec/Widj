import express from "express";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchPagePrice(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8"
    }
  });

  const html = await res.text();

  if (!html || html.length < 1000) {
    throw new Error("Blocked or empty response");
  }

  const $ = cheerio.load(html);
  const text = $("body").text();

  // всі ціни типу 52.99
  const matches = text.match(/[0-9]{2}\.[0-9]{2}/g);

  if (!matches) return null;

  const nums = matches.map(n => parseFloat(n));

  // фільтр реальних паливних цін
  const filtered = nums.filter(n => n > 30 && n < 80);

  if (!filtered.length) return null;

  const avg =
    filtered.reduce((a, b) => a + b, 0) / filtered.length;

  return parseFloat(avg.toFixed(2));
}

app.get("/", (req, res) => {
  res.send("AUTO.RIA Fuel API 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const dieselUrl = "https://auto.ria.com/uk/toplivo/dt/";
    const gasolineUrl = "https://auto.ria.com/uk/toplivo/a95/";

    const [diesel, gasoline] = await Promise.all([
      fetchPagePrice(dieselUrl),
      fetchPagePrice(gasolineUrl)
    ]);

    if (!diesel || !gasoline) {
      throw new Error("Prices not found");
    }

    cache = {
      diesel,
      gasoline
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "parse error (AUTO.RIA changed layout or blocked)"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
