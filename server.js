import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8"
      }
    });

    const html = await res.text();

    if (html && html.length > 1000) return html;

    throw new Error("Blocked response");
  } catch (e) {
    const proxy =
      "https://api.allorigins.win/raw?url=" +
      encodeURIComponent(url);

    const res = await fetch(proxy);
    return await res.text();
  }
}

function extractDiesel(html) {
  const matches = html.match(/[0-9]{2}\.[0-9]{2}/g);

  if (!matches) return null;

  const nums = matches.map(n => parseFloat(n));

  const filtered = nums.filter(n => n > 40 && n < 80);

  if (!filtered.length) return null;

  const avg =
    filtered.reduce((a, b) => a + b, 0) / filtered.length;

  return avg;
}

// health check (ВАЖЛИВО для Render)
app.get("/", (req, res) => {
  res.send("Fuel API is running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const url = "https://e-palne.com/ua/kyiv/";

    const html = await fetchHTML(url);

    if (!html || html.length < 1000) {
      throw new Error("Empty HTML");
    }

    const diesel = extractDiesel(html);

    if (!diesel) {
      throw new Error("Diesel not found");
    }

    cache = {
      diesel: parseFloat(diesel.toFixed(2))
    };

    lastFetch = now;

    res.json(cache);
  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({ error: "parse error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
