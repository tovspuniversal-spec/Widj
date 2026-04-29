import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function getPrice(url) {
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

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  // чекаємо рендер
  await new Promise(r => setTimeout(r, 3000));

  const price = await page.evaluate(() => {
    // беремо всі числа на сторінці
    const matches = document.body.innerText.match(/[0-9]{2}\.[0-9]{2}/g);

    if (!matches) return null;

    const nums = matches
      .map(n => parseFloat(n))
      .filter(n => n > 45 && n < 80);

    if (!nums.length) return null;

    // беремо середнє (стабільніше)
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  });

  await browser.close();
if (!price) {
  console.log("Fallback used for:", url);
  return null;
}

return price;
}


app.get("/", (req, res) => {
  res.send("Fuel Puppeteer API 🚀");
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
    const dieselUrl =
      "https://auto.ria.com/uk/toplivo/dt/";

    const gasolineUrl =
      "https://auto.ria.com/uk/toplivo/a95/";

    const [diesel, gasoline] = await Promise.all([
      getPrice(dieselUrl),
      getPrice(gasolineUrl)
    ]);

    cache = {
  diesel: diesel ? Number(diesel.toFixed(2)) : 55,
  gasoline: gasoline ? Number(gasoline.toFixed(2)) : 58
};


    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      error: "puppeteer parse error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
