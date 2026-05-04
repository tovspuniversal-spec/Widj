import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getDieselPrice() {
  const { data } = await axios.get(
    "https://besttarif.ua/fuel-informer/",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
        "Referer": "https://www.google.com/"
      },
      timeout: 15000
    }
  );

  const $ = cheerio.load(data);

  let dpIndex = -1;
  let price = null;

  const table = $("table").first();
  const rows = table.find("tr");

  const headerCells = rows.first().find("th, td");

  headerCells.each((i, el) => {
    const text = $(el).text().trim().toUpperCase();
    if (text === "ДП") dpIndex = i;
  });

  if (dpIndex === -1) return null;

  const dataRow = rows.eq(1).find("td, th");
  const cell = dataRow.eq(dpIndex);

  const match = cell.text().match(/(\d+[.,]?\d*)/);

  price = match ? parseFloat(match[1].replace(",", ".")) : null;

  return price;
}


// routes
app.get("/", (req, res) => {
  res.send("Diesel API (besttarif) 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const diesel = await getDieselPrice();

    if (!diesel) {
      throw new Error("DP price not found");
    }

    cache = {
      diesel: Number(diesel.toFixed(2)),
      source: "besttarif.ua",
      fuel: "DP",
      updatedAt: new Date().toISOString()
    };

    lastFetch = now;

    return res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    return res.status(500).json({
      error: "parse error",
      details: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
