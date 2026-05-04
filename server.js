import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getUPGDieselPrice() {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );

  await page.goto("https://vseazs.com", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 4000));

  const price = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tr"));

    for (const row of rows) {
      const text = row.innerText;

      if (text.includes("UPG")) {
        // шукаємо ціну типу 86.90
        const match = text.match(/[0-9]{2}\.[0-9]{2}/);

        if (match) {
          return parseFloat(match[0]);
        }
      }
    }

    return null;
  });

  await browser.close();

  return price;
}

app.get("/", (req, res) => {
  res.send("UPG Diesel API 🚀");
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

    cache = {
      diesel: diesel ? Number(diesel.toFixed(2)) : null,
      source: "UPG",
      updatedAt: new Date().toISOString()
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "parse error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
