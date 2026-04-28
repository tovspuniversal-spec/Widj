import express from "express";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

let cache = null;
let lastFetch = 0;

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const url = "https://e-palne.com/ua/kyiv/";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    let diesel = null;

    const text = $("body").text(
