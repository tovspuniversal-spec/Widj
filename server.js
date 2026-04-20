const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

app.get("/fuel.json", async (req, res) => {
  try {
    const { data } = await axios.get("https://index.minfin.com.ua/ua/markets/fuel/");

    const clean = (label) => {
      const regex = new RegExp(label + "[^0-9]*([0-9]+\\.[0-9]+)");
      const match = data.match(regex);
      return match ? match[1] : "—";
    };

    res.json({
      ukraine: {
        a95: clean("А-95"),
        diesel: clean("ДП"),
        lpg: clean("Газ")
      },
      updated: new Date().toISOString()
    });

  } catch (e) {
    res.json({
      error: "parse_failed",
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
