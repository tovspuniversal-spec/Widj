import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

let cache = null;
let lastFetch = 0;

async function fetchFuelPrice() {
  const url = "https://api.collectapi.com/gasPrice/allCountries";

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();

  if (!data || !data.result) {
    throw new Error("Invalid API response");
  }

  const ua = data.result.find(
    (c) => c.country && c.country.toLowerCase().includes("ukraine")
  );

  if (!ua) throw new Error("Ukraine not found");

  return {
    diesel: Number(ua.diesel),
    gasoline: Number(ua.gasoline)
  };
}

// root
app.get("/", (req, res) => {
  res.send("Fuel API running 🚀");
});

// health
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// main API
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

    if (cache) {
      return res.json(cache);
    }

    res.status(500).json({ error: "fetch error" });
  }
});

// start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
