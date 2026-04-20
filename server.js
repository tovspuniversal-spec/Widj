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

  const name = $(el).find("th, td").first().text();

  const price = tds.eq(tds.length - 1).text().trim();

  if (name.includes("А-95")) {
    a95 = price;
  }

  if (name.includes("ДП")) {
    diesel = price;
  }

  if (name.includes("Газ")) {
    lpg = price;
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
