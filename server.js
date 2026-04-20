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
      const text = $(el).text();

      if (text.includes("А-95")) {
        a95 = $(el).find("td").last().text().trim();
      }

      if (text.includes("ДП")) {
        diesel = $(el).find("td").last().text().trim();
      }

      if (text.includes("Газ")) {
        lpg = $(el).find("td").last().text().trim();
      }
    });

    res.json({
      ukraine: { a95, diesel, lpg },
      updated: new Date().toISOString()
    });

  } catch (e) {
    res.json({
      error: "parse error",
      updated: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
