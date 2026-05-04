import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getUPGDieselPrice() {
  const { data } = await axios.get("https://auto.ria.com/uk/toplivo/upg/dt/");

  const $ = cheerio.load(data);

  let price = null;

  $("body").each((_, el) => {
    const text = $(el).text();

    const match = text.match(/[0-9]{2}\.[0-9]{2}/);

    if (match) {
      price = parseFloat(match[0]);
    }
  });

  return price;
}

app.get("/", (req, res) => {
  res.send("UPG Diesel API (no puppeteer) 🚀");
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
    const diesel = await getUPGDieselPrice();

    if (!diesel) {
      throw new Error("No price found");
    }

    cache = {
      diesel: Number(diesel.toFixed(2)),
      source: "UPG",
      updatedAt: new Date().toISOString()
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "parse error",
      details: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
