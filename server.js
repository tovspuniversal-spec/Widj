const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

let cache = null;
let cacheTime = 0;
const TTL = 30 * 60 * 1000; // 30 хв

// 🟢 1. курс НБУ
async function getFX() {
  const { data } = await axios.get(
    "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
  );

  const usd = data.find(x => x.cc === "USD");
  return usd ? usd.rate : 41.5; // fallback
}

// 🟡 2. базова світова ціна пального (USD)
function getGlobalFuelUSD() {
  return {
    a95: 1.52,
    diesel: 1.45,
    lpg: 0.85
  };
}

// 🔥 конвертація
function convertToUAH(fuelUSD, fx) {
  return {
    a95: (fuelUSD.a95 * fx).toFixed(2),
    diesel: (fuelUSD.diesel * fx).toFixed(2),
    lpg: (fuelUSD.lpg * fx).toFixed(2)
  };
}

app.get("/fuel.json", async (req, res) => {
  try {
    const now = Date.now();

    if (cache && now - cacheTime < TTL) {
      return res.json({ ...cache, cached: true });
    }

    const fx = await getFX();
    const usd = getGlobalFuelUSD();
    const uah = convertToUAH(usd, fx);

    const result = {
      ukraine: uah,
      fx: fx,
      base_usd: usd,
      updated: new Date().toISOString(),
      mode: "FX_FUEL_INDEX"
    };

    cache = result;
    cacheTime = now;

    res.json(result);

  } catch (e) {
    res.json({
      error: "fx_index_fallback",
      ukraine: {
        a95: "—",
        diesel: "—",
        lpg: "—"
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("FX Fuel Index running"));
