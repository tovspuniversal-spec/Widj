import express from "express";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchMinfinPrice(url, label) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8"
    }
  });

  const html = await res.text();

  if (!html || html.length < 1000) {
    throw new Error("Blocked HTML");
  }

  const $ = cheerio.load(html);

  // беремо таблицю з цінами
  const rows = $("table tr");

  let price = null;

  rows.each((_, el) => {
    const text = $(el).text();

    // шукаємо рядок з потрібним паливом
    if (text.toLowerCase().includes(label)) {
      const match = text.match(/[0-9]{2,3}[.,][0-9]{1,2}/);

      if (match) {
        price = parseFloat(match[0].replace(",", "."));
      }
    }
  });

  if (!price) {
    throw new Error(`Price not found for ${label}`);
  }

  return price;
}

// root
app.get("/", (req, res) => {
  res.send("Minfin Fuel API 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// API
app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const dieselUrl =
      "https://index.minfin.com.ua/ua/markets/fuel/dt/";

    const petrolUrl =
      "https://index.minfin.com.ua/ua/markets/fuel/a95/";

    const [diesel, gasoline] = await Promise.all([
      fetchMinfinPrice(dieselUrl, "дизель"),
      fetchMinfinPrice(petrolUrl, "а-95")
    ]);

    cache = {
      diesel,
      gasoline
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "parse error (minfin structure changed)"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
