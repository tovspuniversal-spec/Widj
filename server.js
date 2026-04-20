const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

// 🔥 кеш (10 хв)
let cache = null;
let cacheTime = 0;

const CACHE_TTL = 10 * 60 * 1000;

// 🔹 fallback джерела (можеш додавати свої)
const sources = [
  "https://fuel-api-78ht.onrender.com/fuel.json", // твій же (для тесту)
];

async function fetchFromSources() {
  for (let url of sources) {
    try {
      const res = await axios.get(url, { timeout: 5000 });
      if (res.data?.ukraine) {
        return res.data;
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error("No sources available");
}

app.get("/fuel.json", async (req, res) => {
  try {
    const now = Date.now();

    // 🔥 якщо кеш ще живий
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json({ ...cache, cached: true });
    }

    const data = await fetchFromSources();

    cache = data;
    cacheTime = now;

    res.json({ ...data, cached: false });

  } catch (e) {
    res.json({
      error: "no_data_available",
      ukraine: {
        a95: "—",
        diesel: "—",
        lpg: "—"
      },
      updated: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Fuel aggregator running on " + PORT);
});
