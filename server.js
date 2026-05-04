import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getA95PriceKyiv() {
  const { data } = await axios.get("https://oilprice.com.ua/kyiv/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });

  const $ = cheerio.load(data);

  const table = $("table").first();
  const rows = table.find("tr");

  // 1-й рядок (індекс 0)
  const targetRow = rows.eq(0);

  const cells = targetRow.find("td, th");

  // 4-та колонка (індекс 3)
  const a95Cell = cells.eq(3);

  if (!a95Cell) return null;

  const text = a95Cell.text().trim();

  const match = text.match(/(\d+[.,]?\d*)/);

  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Kyiv A95 API 🚀 (oilprice.com.ua)");
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
    const a95 = await getA95PriceKyiv();

    if (!a95) {
      throw new Error("A95 price not found");
    }

    cache = {
      fuel: "A95",
      city: "Kyiv",
      price: Number(a95.toFixed(2)),
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
