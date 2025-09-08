// api/index.js - The Final Backend v1.2 (Corrected Delete Logic)

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
    const newData = request.body;
    console.log("Received new log from Roblox:", newData.timestamp);
    if (!newData.matchLog || newData.matchLog.length === 0) {
      return response.status(400).json({ error: "Invalid log data" });
    }
    newData.id = Date.now();
    await kv.lpush(DB_KEY, newData);
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
    
    const logStrings = await kv.lrange(DB_KEY, 0, -1);
    const logs = logStrings.map(str => JSON.parse(JSON.stringify(str))); // Safely parse

    // Find the STRING representation of the log to delete
    const stringToDelete = logs.find(log => log.id === logIdToDelete);
    
    if (!stringToDelete) {
        return response.status(404).json({ error: "Log not found." });
    }

    // [[ THE FIX: Use the original string object to remove it. ]]
    await kv.lrem(DB_KEY, 1, stringToDelete);

    console.log(`Successfully deleted log ID: ${logIdToDelete}`);
    response.status(200).json({ status: "success", message: "Log deleted." });
  } catch (error) {
    console.error("Failed to delete log:", error);
    response.status(500).json({ status: "error" });
  }
});

module.exports = app;
