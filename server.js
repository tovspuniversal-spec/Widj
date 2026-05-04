import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getUpgEuroDieselPrice() {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  await page.goto("https://upg.ua/", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  // 🔥 чекаємо поки з’явиться блок з цінами
  await page.waitForSelector("body", { timeout: 15000 });

  const price = await page.evaluate(() => {
    // 1. знаходимо всі елементи з текстом EURO DIESEL
    const nodes = Array.from(document.querySelectorAll("*"));

    const euroNode = nodes.find(el =>
      el.textContent?.includes("EURO DIESEL")
    );

    if (!euroNode) return null;

    // 2. піднімаємось до логічного контейнера (стабільніше ніж closest div)
    let container = euroNode;

    for (let i = 0; i < 5; i++) {
      if (!container.parentElement) break;
      container = container.parentElement;
    }

    const text = container.innerText || "";

    // 3. витягуємо ціну (₴ або просто число)
    const match = text.match(/(\d{1,3}[.,]?\d{0,2})\s*₴?/);

    return match ? parseFloat(match[1].replace(",", ".")) : null;
  });

  await browser.close();

  return price;
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("UPG EURO DIESEL PROD API 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // 🔁 кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const diesel = await getUpgEuroDieselPrice();

    if (!diesel || isNaN(diesel)) {
      throw new Error("EURO DIESEL not found");
    }

    cache = {
      diesel: Number(diesel.toFixed(2)),
      fuel: "EURO_DIESEL",
      source: "upg.ua",
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
  console.log(`UPG parser running on port ${PORT}`);
});
