import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

app.get("/api/fuel", async (req, res) => {
  try {
    const url = "https://e-palne.com/ua/kyiv/";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // ⚠️ Селектори треба під сайт (можуть змінюватись)
    let diesel = null;

    $("body").each((i, el) => {
      const text = $(el).text();

      const match = text.match(/ДП[^0-9]+([0-9]+[.,][0-9]+)/);
      if (match) {
        diesel = match[1].replace(",", ".");
      }
    });

    if (!diesel) throw "No diesel found";

    res.json({
      diesel: parseFloat(diesel)
    });

  } catch (e) {
    res.status(500).json({ error: "parse error" });
  }
});

app.listen(3000, () => console.log("Server running"));
