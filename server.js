const express = require("express");
const app = express();

app.get("/fuel.json", (req, res) => {
  res.json({
    wog: {
      a95: "56.90",
      diesel: "54.20"
    },
    okko: {
      a95: "57.10",
      diesel: "54.80"
    },
    updated: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
