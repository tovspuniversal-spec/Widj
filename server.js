const express = require("express");
const axios = require("axios");
const app = express();

app.get("/fuel.json", async (req, res) => {
  try {
    // 🔹 джерело (приклад — відкриті дані)
    const response = await axios.get("https://index.minfin.com.ua/ua/markets/fuel/");

    const html = response.data;

    // 🔥 дуже простий парсинг (можна покращити)
    const a95 = html.match(/А-95[\s\S]{0,100}?(\d{2}\.\d{2})/)?.[1] || "—";
    const diesel = html.match(/ДП[\s\S]{0,100}?(\d{2}\.\d{2})/)?.[1] || "—";
    const lpg = html.match(/Газ[\s\S]{0,100}?(\d{2}\.\d{2})/)?.[1] || "—";

    res.json({
      ukraine: {
        a95,
        diesel,
        lpg
      },
      updated: new Date().toISOString()
    });

  } catch (e) {
    res.json({
      error: "Не вдалося отримати дані",
      updated: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
