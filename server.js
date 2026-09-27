const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ Connected to Neon:", result.rows[0]);
    }
});

let attributes = [];

async function loadAttributes() {
    try {
        const result = await pool.query(
            "SELECT * FROM attributes ORDER BY id"
        );

        attributes = result.rows;

    } catch (error) {
        console.error("Failed to load attributes:", error);
        throw error;
    }
}

let matchups = {};

async function loadMatchups() {
    try {
        const result = await pool.query(
            "SELECT * FROM matchups"
        );

        result.rows.forEach(row => {
            matchups[row.player_id] ??= {};
            matchups[row.player_id][row.opponent_id] = row.ratio;
        });

    } catch (error) {
        console.error("Failed to load matchups:", error);
        throw error;
    }
}

app.get("/api/data", (req, res) => {
    res.json({
        attributes,
        matchups
    });
});


app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await loadAttributes();
        await loadMatchups();
        
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("❌ Server failed to start.");
        process.exit(1);
    }
}

startServer();