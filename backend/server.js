import express from "express";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Needed for ES modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files (index.html, game.js, style.css, Assets folder)
app.use(express.static(path.join(__dirname, "../frontend")));

// Supabase credentials
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // kept secret in .env
);

// Save score
app.post("/submit-score", async (req, res) => {
  const { player_name, score } = req.body;

  if (!player_name || !score) {
    return res.status(400).json({ error: "Missing username or score" });
  }

  const { error } = await supabase.from("highscores").insert([{ player_name, score }]);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Score saved!" });
});

// Get world record
app.get("/world-record", async (req, res) => {
  const { data, error } = await supabase
    .from("highscores")
    .select("player_name, score")
    .order("score", { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data[0]);
});

// Get top 10 leaderboard
app.get("/leaderboard", async (req, res) => {
  const { data, error } = await supabase
    .from("highscores")
    .select("player_name, score")
    .order("score", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// Fallback route for SPA (optional if you have client-side routing)
app.get("/:any(*)", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
