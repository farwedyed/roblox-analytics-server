// api/index.js - The Backend Logic for Vercel

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json({ limit: "100kb" }));

// On Vercel, the only writable directory is /tmp
const dbPath = path.join('/tmp', "chatlogs.json");

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([]));
}

app.post("/api/log-match", (request, response) => {
  // This function remains the same as the correct Replit version
  try {
    const newData = request.body;
    let logs = [];
    try {
      const fileData = fs.readFileSync(dbPath, 'utf8');
      if (fileData.trim() !== '') { logs = JSON.parse(fileData); }
    } catch (e) {}
    
    newData.id = Date.now();
    logs.unshift(newData);
    if (logs.length > 200) { logs.length = 200; }
    fs.writeFileSync(dbPath, JSON.stringify(logs, null, 2));
    response.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Failed to process log:", error);
    response.status(500).json({ status: "error" });
  }
});

app.get("/api/get-logs", (request, response) => {
  // This function remains the same as the correct Replit version
  try {
    const fileData = fs.readFileSync(dbPath, 'utf8');
    if (fileData.trim() === '') { return response.json([]); }
    const logs = JSON.parse(fileData);
    response.json(logs);
  } catch (error) {
    console.error("Failed to read or parse logs:", error);
    response.json([]);
  }
});

app.delete("/api/delete-log/:id", (request, response) => {
  // This function remains the same as the correct Replit version
  try {
    const { password } = request.body;
    const logIdToDelete = parseInt(request.params.id, 10);
    if (password !== "22ai23") {
      return response.status(401).json({ error: "Unauthorized: Incorrect password." });
    }
    let logs = JSON.parse(fs.readFileSync(dbPath));
    const updatedLogs = logs.filter(log => log.id !== logIdToDelete);
    fs.writeFileSync(dbPath, JSON.stringify(updatedLogs, null, 2));
    response.status(200).json({ status: "success", message: "Log deleted." });
  } catch (error) {
    console.error("Failed to delete log:", error);
    response.status(500).json({ status: "error" });
  }
});

// This allows Vercel to handle the server
module.exports = app;
