const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

app.get("/fuel.json", async (req, res) => {
  try {
    const response = await axios.get("https://index.minfin.com.ua/ua/markets/fuel/");
    const $ = cheerio.load(response.data);

    let a95 = "—";
    let diesel = "—";
    let lpg = "—";

    $("table tr").each((i, el) => {
      const tds = $(el).find("td");
      const title = $(el).find("th, td").first().text().trim();

      // беремо саме останню колонку як ціну
      const price = tds.last().text().trim();

      if (title.includes("А-95") && price) {
        a95 = price;
      }

      if ((title.includes("ДП") || title.toLowerCase().includes("дизель")) && price) {
        diesel = price;
      }

      if (title.includes("Газ") && price) {
        lpg = price;
      }
    });

    res.json({
      ukraine: {
        a95,
        diesel,
        lpg
      },
      updated: new Date().toISOString()
    });

  } catch (error) {
    res.json({
      error: "failed_to_fetch_data",
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
  console.log("Server running on port " + PORT);
});
