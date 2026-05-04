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
})
