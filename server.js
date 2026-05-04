import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

let cache = null;
let lastFetch = 0;

function parseNumber(text) {
  const match = String(text).match(/(\d+[.,]\d+|\d+)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

async function getFuelPrices() {
  const { data } = await axios.get("https://oilprice.com.ua/kyiv/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    timeout: 15000
  });

  const $ = cheerio.load(data);
  const rows = $("table").first().find("tr");

  if (rows.length < 2) {
    throw new Error("Table structure changed");
  }

  const row = rows.eq(1);
  const cells = row.find("td, th").map((_, el) => $(el).text().trim()).get();

  if (cells.length < 6) {
    throw new Error(`Not enough columns: ${cells.length}`);
  }

  const gasoline = parseNumber(cells[3]);
  const diesel = parseNumber(cells[5]);

  if (!Number.isFinite(diesel) || !Number.isFinite(gasoline)) {
    throw new Error(`Prices not found. Cells: ${JSON.stringify(cells)}`);
  }

  return { diesel, gasoline };
}

app.get("/", (req, res) => {
  res.send("Fuel API (Kyiv) 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < 30 * 60 * 1000) {
    return res.json(cache);
  }

  try {
    const { diesel, gasoline } = await getFuelPrices();

    cache = {
      diesel: Number(diesel.toFixed(2)),
      gasoline: Number(gasoline.toFixed(2)),
      city: "Kyiv",
      source: "oilprice.com.ua",
      updatedAt: new Date().toISOString()
    };

    lastFetch = now;

    res.json(cache);
  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) {
      return res.json({
        ...cache,
        fallback: true,
        fallbackReason: err.message
      });
    }

    res.status(500).json({
      error: "parse error",
      details: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
