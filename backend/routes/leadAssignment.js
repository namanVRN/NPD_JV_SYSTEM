const express = require("express");
const router = express.Router();
const {
  SHEETS,
  getSheetData,
  appendRow,
} = require("../utils/sheets");

const SHEET_NAME = SHEETS.ASSIGNMENT_LOGGER;
const USER_SHEET = "User";

// Column mapping (0-indexed) - Assignment Logger sheet
const COL = {
  TIMESTAMP: 0,      // A
  ENQ_NO: 1,         // B
  CLIENT_NAME: 2,    // C
  FROM: 3,           // D
  TO: 4,             // E
  ASSIGNED_BY: 5,    // F
  STEP_NAME: 6,      // G
};

function getCurrentTimestamp() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// ─── GET /api/lead-assignment/all ─────────────────────────
// Returns all assignments with LATEST per EnQ No
router.get("/all", async (req, res) => {
  try {
    const data = await getSheetData(SHEET_NAME);

    if (!data || data.length <= 1) {
      return res.json({ assignments: [], latestByEnq: {} });
    }

    const assignments = [];
    const latestByEnq = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !(row[COL.ENQ_NO] || "").toString().trim()) continue;

      const entry = {
        rowIndex: i + 1,
        timestamp: (row[COL.TIMESTAMP] || "").toString().trim(),
        enqNo: (row[COL.ENQ_NO] || "").toString().trim(),
        clientName: (row[COL.CLIENT_NAME] || "").toString().trim(),
        from: (row[COL.FROM] || "").toString().trim(),
        to: (row[COL.TO] || "").toString().trim(),
        assignedBy: (row[COL.ASSIGNED_BY] || "").toString().trim(),
        stepName: (row[COL.STEP_NAME] || "").toString().trim(),
      };

      assignments.push(entry);

      // Track latest by EnQ No (last row wins since we iterate top-to-bottom)
      latestByEnq[entry.enqNo] = entry;
    }

    res.json({ assignments, latestByEnq });
  } catch (err) {
    console.error("Lead Assignment /all error:", err);
    res.status(500).json({ error: "Failed to fetch assignments", details: err.message });
  }
});

// ─── GET /api/lead-assignment/latest ──────────────────────
// Returns { enqNo: "userName" } map for quick lookup
router.get("/latest", async (req, res) => {
  try {
    const data = await getSheetData(SHEET_NAME);

    if (!data || data.length <= 1) {
      return res.json({ latestByEnq: {} });
    }

    const latestByEnq = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !(row[COL.ENQ_NO] || "").toString().trim()) continue;

      const enqNo = (row[COL.ENQ_NO] || "").toString().trim();
      const to = (row[COL.TO] || "").toString().trim();
      const timestamp = (row[COL.TIMESTAMP] || "").toString().trim();

      // Later entries override earlier (last wins)
      latestByEnq[enqNo] = {
        assignedTo: to,
        timestamp,
      };
    }

    res.json({ latestByEnq });
  } catch (err) {
    console.error("Lead Assignment /latest error:", err);
    res.status(500).json({ error: "Failed to fetch latest assignments", details: err.message });
  }
});

// ─── GET /api/lead-assignment/history?enqNo=XXX ───────────
// Returns history for a specific lead
router.get("/history", async (req, res) => {
  try {
    const { enqNo } = req.query;
    if (!enqNo) return res.status(400).json({ error: "enqNo is required" });

    const data = await getSheetData(SHEET_NAME);

    if (!data || data.length <= 1) {
      return res.json({ history: [] });
    }

    const history = [];
    const target = enqNo.trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;

      const rowEnq = (row[COL.ENQ_NO] || "").toString().trim().toLowerCase();
      if (rowEnq !== target) continue;

      history.push({
        rowIndex: i + 1,
        timestamp: (row[COL.TIMESTAMP] || "").toString().trim(),
        enqNo: (row[COL.ENQ_NO] || "").toString().trim(),
        clientName: (row[COL.CLIENT_NAME] || "").toString().trim(),
        from: (row[COL.FROM] || "").toString().trim(),
        to: (row[COL.TO] || "").toString().trim(),
        assignedBy: (row[COL.ASSIGNED_BY] || "").toString().trim(),
        stepName: (row[COL.STEP_NAME] || "").toString().trim(),
      });
    }

    // Sort newest first
    history.reverse();

    res.json({ history });
  } catch (err) {
    console.error("Lead Assignment /history error:", err);
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
});

// ─── POST /api/lead-assignment/assign ─────────────────────
// Admin assigns/reassigns a lead
router.post("/assign", async (req, res) => {
  try {
    const {
      enqNo,
      clientName,
      assignedTo,
      assignedBy,
      stepName,
      currentUserRole,
    } = req.body;

    if (!enqNo || !assignedTo || !assignedBy) {
      return res.status(400).json({ error: "enqNo, assignedTo, and assignedBy are required" });
    }

    // ✅ ADMIN ONLY validation
    if ((currentUserRole || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Only Admin can assign leads" });
    }

    // Find current assignment (latest for this EnQ No)
    const data = await getSheetData(SHEET_NAME);
    let currentAssignee = "Unassigned";

    if (data && data.length > 1) {
      const target = enqNo.trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        const rowEnq = (row[COL.ENQ_NO] || "").toString().trim().toLowerCase();
        if (rowEnq === target) {
          currentAssignee = (row[COL.TO] || "").toString().trim() || "Unassigned";
        }
      }
    }

    // If same user, don't log
    if (currentAssignee.trim().toLowerCase() === assignedTo.trim().toLowerCase()) {
      return res.json({
        success: true,
        message: "Lead is already assigned to this user",
        noChange: true,
      });
    }

    // Append new entry
    const timestamp = getCurrentTimestamp();
    const newRow = [
      timestamp,                        // A - Timestamp
      enqNo.trim(),                     // B - EnQ No
      (clientName || "").trim(),        // C - Client Name
      currentAssignee,                  // D - From
      assignedTo.trim(),                // E - To
      assignedBy.trim(),                // F - Assigned By
      (stepName || "").trim(),          // G - Step Name
    ];

    await appendRow(SHEET_NAME, newRow);

    res.json({
      success: true,
      message: `Lead ${enqNo} assigned to ${assignedTo}`,
      from: currentAssignee,
      to: assignedTo,
    });
  } catch (err) {
    console.error("Lead Assignment /assign error:", err);
    res.status(500).json({ error: "Assignment failed", details: err.message });
  }
});

// ─── GET /api/lead-assignment/users ───────────────────────
// Fetch all users from User sheet (Col C = User Name)
router.get("/users", async (req, res) => {
  try {
    const rows = await getSheetData(USER_SHEET);
    if (!rows || rows.length <= 1) return res.json({ users: [] });

    const users = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[2]) continue;  // Col C = User Name
      users.push({
        id: (row[0] || "").toString().trim(),
        userName: (row[2] || "").toString().trim(),
        role: (row[3] || "").toString().trim(),
      });
    }

    res.json({ users });
  } catch (err) {
    console.error("Lead Assignment /users error:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
});

module.exports = router;