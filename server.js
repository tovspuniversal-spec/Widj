import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

let cache = null;
let lastFetch = 0;

async function fetchHTML(url) {
  // 1. пробуємо напряму
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8"
      }
    });

    const html = await res.text();

    if (html && html.length > 1000) {
      return html;
    }

    throw new Error("Direct fetch blocked");
  } catch (e) {
    // 2. fallback через проксі
    const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);

    const res = await fetch(proxy);
    const html = await res.text();

    return html;
  }
}

function extractDiesel(html) {
  // знаходимо всі числа типу 52.90
  const matches = html.match(/[0-9]{2}\.[0-9]{2}/g);

  if (!matches) return null;

  const nums = matches.map(n => parseFloat(n));

  // залишаємо тільки адекватні ціни
  const filtered = nums.filter(n => n > 40 && n < 80);

  if (!filtered.length) return null;

  // середнє значення
  const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;

  return avg;
}

app
