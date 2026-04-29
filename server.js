import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchFuelPrice() {
  const url = "https://api.collectapi.com/gasPrice/allCountries";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // якщо API попросить ключ — додаси сюди
      // "authorization": "apikey YOUR_KEY"
    }
  });

  const data = await res.json();

  if (!data || !data.result) {
    throw new Error("Invalid API response");
  }

  // шукаємо Україну
  const ua = data.result.find(
    (c) =>
      c.country &&
      c.country.toLowerCase().includes("ukraine")
  );

  if (!ua) throw new Error("Ukraine not found");

  return {
    gasoline: parseFloat(ua.gasoline),
    diesel: parseFloat(ua.diesel)
  };
}

// health check
app.get("/", (req, res) => {
  res.send("Fuel API (GlobalPetrolPrices) running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  // кеш 30 хв
  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const prices = await fetchFuelPrice();

    cache = {
      diesel: prices.diesel,
      gasoline: prices.gasoline
    };

    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error("ERROR:", err.message);

    if (cache) return res.json(cache);

    res.status(500).json({
      err
