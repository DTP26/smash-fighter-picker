// Express is the Node.js application 
const express = require("express");

//node-postgres is the PostgreSQL client
const { Pool } = require("pg");

// dotenv used to secure connection with database
require("dotenv").config();

const app = express();

// ensures proper permissions to access database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// confirms whether or not db connection was successful
pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
    } else {
        console.log("✅ Connected to Neon:", result.rows[0]);
    }
});

/*
    Defines and loads the attributes array
    One row per character, primary keyed by an int ID
    Each column is a different attribute, all either ints between -1 and 1 or booleans
    Only exception is the effective range column, which ranges from [1, 6]
*/ 

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

/* 
    Defines the matchups object.
    Each row contains a player_id, opponent_id, and ratio value.
    Player and opponent ids align with the ones established in the attributes 
    The ratio is either 1 (winning), 0 (even), or -1 (losing), and it 
    desribes how players of the player_id character think they do vs the opposing character
*/

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

// Relatively quick request due to all data being loaded on site startup

app.get("/api/data", (req, res) => {
    res.json({
        attributes,
        matchups
    });
});

// middleware for parsing json and static files 
app.use(express.json());
app.use(express.static("public"));

// connects to port 3000, loads all the data, and starts the server

const PORT = 3000;

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