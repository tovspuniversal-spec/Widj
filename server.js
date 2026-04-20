const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

// 🔥 OpenVan endpoint (може змінюватись)
const OPENVAN_URL = "https://openvan.camp/api/fuel_prices/ukraine";

// fallback (якщо API впаде)
const fallback = {
  a95: 72.0,
  diesel: 87.0,
  lpg: 32.0
};

function parseOpenVan(data) {
  try {
    return {
      a95: parseFloat(data.gasoline_95),
      diesel: parseFloat(data.diesel),
      lpg: parseFloat(data.lpg)
    };
  } catch {
    return fallback;
  }
}

app.get("/fuel.json", async (req, res) => {
  try {
    const response = await axios.get(OPENVAN_URL);

    const prices = parseOpenVan(response.data);

    res.json({
      ukraine: prices,
      source: "openvan",
      updated: new Date().toISOString()
    });

  } catch (err) {
    res.json({
      ukraine: fallback,
      source: "fallback",
      updated: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Fuel API running"));
