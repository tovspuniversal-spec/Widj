import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchFuelPrice() {
  const res = await fetch(
    "https://api.exchangerate.host/latest?base=USD&symbols=UAH"
  );

  const data = await res.json();
  const usd = data.rates.UAH;

  return {
    diesel: usd * 1.25,
    gasoline: usd * 1.35
  };
}

app.get("/", (req, res) => {
  res.send("Fuel API running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/fuel", async (req, res) => {
  const now = Date.now();

  if (cache && now - lastFetch < 1800000) {
    return res.json(cache);
  }

  try {
    const prices = await fetchFuelPrice();

    cache = prices;
    lastFetch = now;

    res.json(cache);

  } catch (err) {
    console.error(err);

    if (cache) return res.json(cache);

    res.status(500).json({ error: "fetch error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
