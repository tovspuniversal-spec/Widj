import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getDieselPrice() {
  const { data } = await axios.get(
    "https://euro5.ua/tsiny-na-palne/",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    }
  );

  const $ = cheerio.load(data);

  let price = null;

  // 1. знайти елемент з текстом "ДП"
  const dpCell = $("td, th")
    .filter((i, el) => $(el).text().trim() === "ДП")
    .first();

  if (!dpCell) return null;

  // 2. піднятись до рядка
  const dpRow = dpCell.closest("tr");

  // 3. взяти наступний рядок (де зазвичай ціна)
  const nextRow = dpRow.next("tr");

  if (!nextRow) return null;

  // 4. взяти всі клітинки
  const cells = nextRow.find("td, th");

  // 5. шукаємо перше число в рядку
  cells.each((i, el) => {
    const text = $(el).text().trim();

    const match = text.match(/(\d+[.,]?\d*)/);

    if (match && !price) {
      price = parseFloat(match[1].replace(",", "."));
    }
  });

  return price;
}

// routes
app.get("/", (req, res) => {
  res.send("Euro5 Diesel API 🚀");
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
      source: "euro5.ua",
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
