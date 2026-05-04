import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getFuelPrices() {
  const { data } = await axios.get("https://oilprice.com.ua/kyiv/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });

  const $ = cheerio.load(data);

  const table = $("table").first();
  const rows = table.find("tr");

  let diesel = null;
  let gasoline = null;

  rows.each((i, row) => {
    const cells = $(row).find("td, th");

    if (cells.length < 6) return;

    // 👉 ДП (припускаємо, що він є в 5-й колонці або окремо в рядку)
    const col5 = cells.eq(4).text().trim();
    const col4 = cells.eq(3).text().trim(); // A95

    // витягуємо числа
    const dieselMatch = col5.match(/(\d+[.,]?\d*)/);
    const gasolineMatch = col4.match(/(\d+[.,]?\d*)/);

    if (!diesel && dieselMatch) {
      diesel = parseFloat(dieselMatch[1].replace(",", "."));
    }

    if (!gasoline && gasolineMatch) {
      gasoline = parseFloat(gasolineMatch[1].replace(",", "."));
    }
  });

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
      throw new Error("Fuel prices not found");
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
