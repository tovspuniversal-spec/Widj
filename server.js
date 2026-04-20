const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

let cache = null;
let cacheTime = 0;
const TTL = 20 * 60 * 1000; // 20 хв

const fallback = {
  a95: 56.90,
  diesel: 54.20,
  lpg: 32.10
};

// 🔥 SOURCE 1 — Minfin (ринкові середні)
async function sourceMinfin() {
  const { data } = await axios.get(
    "https://index.minfin.com.ua/ua/markets/fuel/",
    { timeout: 8000 }
  );

  const extract = (label) => {
    const r = new RegExp(label + "[^0-9]*([0-9]+\\.[0-9]+)");
    const m = data.match(r);
    return m ? parseFloat(m[1]) : null;
  };

  return {
    a95: extract("А-95"),
    diesel: extract("ДП"),
    lpg: extract("Газ")
  };
}

// 🔥 SOURCE 2 — резерв (поки симуляція стабільного ринку)
async function sourceBackup() {
  // тут можна підключити другий агрегатор пізніше
  return {
    a95: fallback.a95,
    diesel: fallback.diesel,
    lpg: fallback.lpg
  };
}

// 🔥 weighted average
function avg(v1, v2, w1 = 0.6, w2 = 0.4) {
  if (v1 && v2) return ((v1 * w1) + (v2 * w2)).toFixed(2);
  return (v1 || v2 || null);
}

app.get("/fuel.json", async (req, res) => {
  try {
    const now = Date.now();

    if (cache && now - cacheTime < TTL) {
      return res.json({ ...cache, cached: true });
    }

    let s1 = null;
    let s2 = null;

    try {
      s1 = await sourceMinfin();
    } catch (e) {}

    try {
      s2 = await sourceBackup();
    } catch (e) {}

    const result = {
      ukraine: {
        a95: avg(s1?.a95, s2?.a95) || fallback.a95,
        diesel: avg(s1?.diesel, s2?.diesel) || fallback.diesel,
        lpg: avg(s1?.lpg, s2?.lpg) || fallback.lpg
      },
      updated: new Date().toISOString(),
      sources: ["minfin", "backup"],
      mode: "PRO_A"
    };

    cache = result;
    cacheTime = now;

    res.json(result);

  } catch (e) {
    res.json({
      ukraine: fallback,
      error: "fallback_only",
      updated: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("PRO A Aggregator running on " + PORT);
});
