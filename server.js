import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

// кеш
let cache = null;
let lastFetch = 0;

// ================= ПАРСЕР =================
async function getFuelPrices() {
  const { data } = await axios.get("https://oilprice.com.ua/kyiv/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    timeout: 15000
  });

  const $ = cheerio.load(data);

  const table = $("table").first();
  const rows = table.find("tr");

  if (rows.length < 2) {
    throw new Error("Table structure changed");
  }

  // 👉 2-й рядок
  const row = rows.eq(1);
  const cells = row.find("td, th");

  if (cells.length < 6) {
    throw new Error("Not enough columns");
  }

  // 👉 колонки
  const rawA95 = cells.eq(3).text().trim();
  const rawDP = cells.eq(5).text().trim();

  // 👉 функція парсингу
  const parseNumber = (text) => {
    const match = text.match(/(\d+[.,]?\d*)/);
    return match ? parseFloat(match[1].replace(",", ".")) : null;
  };

  const gasoline = parseNumber(rawA95);
  const diesel = parseNumber(rawDP);

  return { diesel, gasoline };
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Fuel API (Kyiv) 🚀");
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
    const { diesel, gasoline } = await getFuelPrices();

    if (!diesel || !gasoline) {
      throw new Error("Prices not found");
    }

    cache = {
      diesel: Number(diesel.toFixed(2)),
      gasoline: Number(gasoline.toFixed(2)),
      city: "Kyiv",
      source: "oilprice.com.ua",
      updatedAt: new Date().toISOString()
    };

    lastFetch = now;

    return res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    // fallback на кеш
    if (cache) {
      return res.json(cache);
    }

    return res.status(500).json({
      error: "parse error",
      details: err.message
    });
  }
});

// ================= START =================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
