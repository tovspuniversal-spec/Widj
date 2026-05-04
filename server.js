import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getDieselPrice() {
  const { data } = await axios.get(
    "https://besttarif.ua/fuel-informer/"
  );

  const $ = cheerio.load(data);

  let dpIndex = -1;
  let price = null;

  // 1. знайти таблицю
  const table = $("table").first();

  const rows = table.find("tr");

  // 2. заголовок (перша строка)
  const headerCells = rows.first().find("th, td");

  headerCells.each((i, el) => {
    const text = $(el).text().trim().toUpperCase();

    if (text === "ДП") {
      dpIndex = i;
    }
  });

  if (dpIndex === -1) return null;

  // 3. беремо перший рядок даних
  const dataRow = rows.eq(1).find("td, th");

  const cell = dataRow.eq(dpIndex);

  if (!cell) return null;

  const text = cell.text().trim();

  // 4. витягуємо число
  const match = text.match(/(\d+[.,]?\d*)/);

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
