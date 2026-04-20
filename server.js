const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

// 🔥 кеш
let cache = null;
let cacheTime = 0;
const TTL = 15 * 60 * 1000; // 15 хв

// 🔥 базові fallback значення (ринкові середні)
const fallback = {
  a95: "56.90",
  diesel: "54.20",
  lpg: "32.10"
};

// 🔥 джерело 1 (Minfin)
async function getMinfin() {
  const url = "https://index.minfin.com.ua/ua/markets/fuel/";
  const { data } = await axios.get(url, { timeout: 8000 });

  const extract = (label) => {
    const regex = new RegExp(label + "[^0-9]*([0-9]+\\.[0-9]+)");
    const match = data.match(regex);
    return match ? parseFloat(match[1]) : null;
  };

  return {
    a95: extract("А-95"),
    diesel: extract("ДП"),
    lpg: extract("Газ")
  };
}

// 🔥 нормалізація
function clean(values) {
  const valid = Object.values(values).filter(v => typeof v === "number");
  if (!valid.length) return null;

  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return avg.toFixed(2);
}

app.get("/fuel.json", async (req, res) => {
  try {
    const now = Date.now();

    // 🔥 кеш
    if (cache && now - cacheTime < TTL) {
      return res.json({ ...cache, cached: true });
    }

    let data;

    try {
      data = await getMinfin();
    } catch (e) {
      data = fallback;
    }

    const result = {
      ukraine: {
        a95: clean({ minfin: data.a95 }) || fallback.a95,
        diesel: clean({ minfin: data.diesel }) || fallback.diesel,
        lpg: clean({ minfin: data.lpg }) || fallback.lpg
      },
      updated: new Date().toISOString(),
      source: "PRO_AGGREGATOR"
    };

    cache = result;
    cacheTime = now;

    res.json(result);

  } catch (e) {
    res.json({
      ukraine: fallback,
      updated: new Date().toISOString(),
      error: "fallback_used"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("PRO Fuel Aggregator running on " + PORT);
});
