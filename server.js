import express from "express";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

let cache = null;
let lastFetch = 0;

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const url = "https://e-palne.com/ua/kyiv/";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const text = $("body").text();

    let diesel = null;

    // шукаємо число після "ДП"
    const match = text.match(/ДП[^0-9]*([0-9]+[.,][0-9]+)/);

    if (match) {
      diesel = parseFloat(match[1].replace(",", "."));
    }

    if (!diesel) {
      throw new Error("Diesel not found");
    }

    cache = { diesel };
    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error(err);

    if (cache) {
      return res.json(cache);
    }

    res.status(500).json({ error: "parse error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
