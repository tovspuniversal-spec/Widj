const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const FILE = "history.json";

// 🟢 ініціалізація історії
function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(FILE));
  } catch {
    return [];
  }
}

function saveHistory(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 🟡 симульовані дані (замінюються твоїм API)
function getCurrentPrices() {
  return {
    a95: 63.95,
    diesel: 63.95,
    lpg: 32.1
  };
}

// 🔥 додати нову точку
function addPoint() {
  let history = loadHistory();

  const now = new Date().toISOString();
  const current = getCurrentPrices();

  history.push({
    time: now,
    ...current
  });

  // 🔥 тримаємо останні 30 записів (≈ 7–10 днів)
  if (history.length > 30) {
    history = history.slice(-30);
  }

  saveHistory(history);
  return history;
}

app.get("/fuel.json", (req, res) => {
  const history = addPoint();

  const last = history[history.length - 1];

  res.json({
    ukraine: last,
    history,
    updated: last.time
  });
});

app.get("/history.json", (req, res) => {
  res.json(loadHistory());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("History API running"));
