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

app.use(express.json());
app.use(express.static("public"));

app.get("/api/attributes", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM attributes ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Query failed:", error);

        res.status(500).json({
            error: "Database query failed"
        });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});