// api/index.js - The Final Backend (with Vercel KV Database)

// 1. SETUP
const express = require("express");
const { createClient } = require("@vercel/kv");
const app = express();
app.use(express.json({ limit: "100kb" }));

// 2. DATABASE SETUP
// This automatically uses the connection details Vercel provides.
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// The key we will use to store our list of logs in the database.
const DB_KEY = "chatlogs";

// 3. API ENDPOINTS

// ENDPOINT 1: RECEIVE DATA FROM ROBLOX
app.post("/api/log-match", async (request, response) => {
  try {
    const newData = request.body;
    console.log("Received new log from Roblox:", newData.timestamp);
    if (!newData.matchLog || newData.matchLog.length === 0) {
      return response.status(400).json({ error: "Invalid log data" });
    }
    newData.id = Date.now();

    // Add the new log to the beginning of our list in the database.
    await kv.lpush(DB_KEY, JSON.stringify(newData));
    
    // Keep the list trimmed to the most recent 200 logs.
    await kv.ltrim(DB_KEY, 0, 199);

    response.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Failed to process log:", error);
    response.status(500).json({ status: "error" });
  }
});

// ENDPOINT 2: PROVIDE DATA TO THE WEBSITE
app.get("/api/get-logs", async (request, response) => {
  try {
    // Get all logs (up to 200) from the database list.
    const logStrings = await kv.lrange(DB_KEY, 0, -1);
    
    // The database stores strings, so we need to parse them back into JSON objects.
    const logs = logStrings.map(logStr => JSON.parse(logStr));
    
    response.json(logs);
  } catch (error) {
    console.error("Failed to read logs:", error);
    response.status(500).json([]);
  }
});

// ENDPOINT 3: SECURELY DELETE A LOG
app.delete("/api/delete-log/:id", async (request, response) => {
  try {
    const { password } = request.body;
    const logIdToDelete = parseInt(request.params.id, 10);

    if (password !== "22ai23") {
      return response.status(401).json({ error: "Unauthorized" });
    }
    
    // Get all logs from the database
    const logStrings = await kv.lrange(DB_KEY, 0, -1);
    const logs = logStrings.map(logStr => JSON.parse(logStr));

    // Find the specific log to delete
    const logToDelete = logs.find(log => log.id === logIdToDelete);
    
    if (!logToDelete) {
        return response.status(404).json({ error: "Log not found." });
    }

    // Tell the database to remove the matching log entry.
    // The '1' means remove only the first occurrence.
    await kv.lrem(DB_KEY, 1, JSON.stringify(logToDelete));

    console.log(`Successfully deleted log ID: ${logIdToDelete}`);
    response.status(200).json({ status: "success", message: "Log deleted." });
  } catch (error) {
    console.error("Failed to delete log:", error);
    response.status(500).json({ status: "error" });
  }
});

// This allows Vercel to handle the server
module.exports = app;
