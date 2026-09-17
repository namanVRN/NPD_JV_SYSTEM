// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();
// const PORT = process.env.PORT || 5000;
// const remarksRoutes = require("./routes/remarks");
// const { getInventoryDashboardData } = require('./utils/inventory');

// // CORS — allow all origins
// app.use(cors());

// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// // Routes
// app.use("/api/auth", require("./routes/auth"));
// app.use("/api/sync", require("./routes/sync"));
// app.use("/api/pipeline", require("./routes/pipeline"));
// app.use("/api/not-qualified", require("./routes/notQualified"));
// app.use("/api/cold-leads", require("./routes/coldLeads"));
// app.use("/api/fms", require("./routes/fms"));
// app.use("/api/done", require("./routes/done"));
// app.use("/api/next-action-plan", require("./routes/nextActionPlan"));
// app.use("/api/site-visit/ecs", require("./routes/siteVisitEcs"));
// app.use("/api/site-visit/fms", require("./routes/siteVisitFms"));
// app.use("/api/remarks", remarksRoutes);
// app.use("/api/lead-assignment", require("./routes/leadAssignment"));

// // Health check
// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok", timestamp: new Date().toISOString() });
// });

// app.get('/api/inventory', async (req, res) => {
//   try {
//     // Apne setup ke according service/JWT auth use karein
//     const auth = new google.auth.GoogleAuth({
//       keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json', // Adjust credentials file path
//       scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
//     });
//     const authClient = await auth.getClient();
//     const spreadsheetId = process.env.INVENTORY_SPREADSHEET_ID || process.env.SPREADSHEET_ID; // Sheet ID from .env

//     if (!spreadsheetId) {
//       return res.status(400).json({ error: 'Spreadsheet ID (INVENTORY_SPREADSHEET_ID) is missing in .env' });
//     }

//     const data = await getInventoryDashboardData(authClient, spreadsheetId);
//     res.json(data);
//   } catch (error) {
//     console.error('Inventory route API Error:', error);
//     res.status(500).json({ error: error.message || 'Error fetching inventory data.' });
//   }
// });

// // Local development
// if (process.env.NODE_ENV !== "production") {
//   app.listen(PORT, () => {
//     console.log(`🚀 JV CRM Backend running on http://localhost:${PORT}`);
//   });
// }

// // Export for Vercel serverless
// module.exports = app;




const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const remarksRoutes = require("./routes/remarks");
const { getInventoryDashboardData } = require("./utils/inventory");

// CORS — allow all origins
app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/sync", require("./routes/sync"));
app.use("/api/pipeline", require("./routes/pipeline"));
app.use("/api/not-qualified", require("./routes/notQualified"));
app.use("/api/cold-leads", require("./routes/coldLeads"));
app.use("/api/fms", require("./routes/fms"));
app.use("/api/done", require("./routes/done"));
app.use("/api/next-action-plan", require("./routes/nextActionPlan"));
app.use("/api/site-visit/ecs", require("./routes/siteVisitEcs"));
app.use("/api/site-visit/fms", require("./routes/siteVisitFms"));
app.use("/api/remarks", remarksRoutes);
app.use("/api/lead-assignment", require("./routes/leadAssignment"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Inventory Dashboard Route
app.get("/api/inventory", async (req, res) => {
  try {
    const spreadsheetId =
      process.env.INVENTORY_SPREADSHEET_ID || process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      return res.status(400).json({
        error: "Spreadsheet ID (INVENTORY_SPREADSHEET_ID or SPREADSHEET_ID) is missing in .env",
      });
    }

    const data = await getInventoryDashboardData(spreadsheetId);
    res.json(data);
  } catch (error) {
    console.error("Inventory route API Error:", error);
    res.status(500).json({ error: error.message || "Error fetching inventory data." });
  }
});

// Local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 JV CRM Backend running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;