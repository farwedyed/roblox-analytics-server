// api/index.js - The Final Backend v1.1 (Corrected Data Handling)

// 1. SETUP
const express = require("express");
const { createClient } = require("@vercel/kv");
const app = express();
app.use(express.json({ limit: "100kb" }));

// 2. DATABASE SETUP
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const DB_KEY = "chatlogs";

// 3. API ENDPOINTS

// ENDPOINT 1: RECEIVE DATA FROM ROBLOX
app.post("/api/log-match", async (request, response) => {
  try {
    const newData = request.body; // This is already a clean JavaScript object
    console.log("Received new log from Roblox:", newData.timestamp);
    if (!newData.matchLog || newData.matchLog.length === 0) {
      return response.status(400).json({ error: "Invalid log data" });
    }
    newData.id = Date.now();

    // [[ THE FIX: Save the object directly. @vercel/kv will handle stringifying. ]]
    await kv.lpush(DB_KEY, newData);
    
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
    // [[ THE FIX: The database now returns clean objects directly. No need for JSON.parse. ]]
    const logs = await kv.lrange(DB_KEY, 0, -1);
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
    const logs = await kv.lrange(DB_KEY, 0, -1);

    // Find the specific log object to delete
    const logToDelete = logs.find(log => log.id === logIdToDelete);
    
    if (!logToDelete) {
        return response.status(404).json({ error: "Log not found." });
    }

    // [[ THE FIX: Tell the database to remove the matching object. ]]
    await kv.lrem(DB_KEY, 1, logToDelete);

    console.log(`Successfully deleted log ID: ${logIdToDelete}`);
    response.status(200).json({ status: "success", message: "Log deleted." });
  } catch (error) {
    console.error("Failed to delete log:", error);
    response.status(500).json({ status: "error" });
  }
});

// This allows Vercel to handle the server
module.exports = app;
