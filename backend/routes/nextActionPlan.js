const express = require("express");
const router = express.Router();
const {
  SHEETS,
  getSheetData,
  appendRow,
  updateCell,
} = require("../utils/sheets");

const SHEET_NAME = SHEETS.NEXT_ACTION;
const USER_SHEET = "User";

const COL = {
  TICKET_ID: 0,
  ENQ_NO: 1,
  CLIENT_NAME: 2,
  LOCATION: 3,
  RAISED_BY: 4,
  RAISED_DATE: 5,
  ASSIGNED_TO: 6,
  ISSUE_DESC: 7,
  DESIRED_DATE: 8,
  STATUS: 9,
  CONFIRMED_DATE: 10,
  REVISED_DATE: 11,
  REVISION_COUNT: 12,
  REVISION_HISTORY: 13,
  COMPLETION_DATE: 14,
  PC_REMARKS: 15,
  DOER_REMARKS: 16,
  SOURCE_TAB: 17,
  STEP_NAME: 18,
};

function colLetter(index) {
  return String.fromCharCode(65 + index);
}

// ✅ HELPER: Parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS to JS Date
function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // Try DD/MM/YYYY format (with optional time)
  const ddmmMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[, ]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ddmmMatch) {
    const [, dd, mm, yyyy, hh, mi, ss] = ddmmMatch;
    return new Date(
      parseInt(yyyy),
      parseInt(mm) - 1,  // month 0-indexed
      parseInt(dd),
      parseInt(hh || 0),
      parseInt(mi || 0),
      parseInt(ss || 0)
    );
  }

  // Try ISO format YYYY-MM-DD
  const isoMatch = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return new Date(str);
  }

  // Fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function generateTicketId() {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length <= 1) return "TKT001";

    let maxNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const tid = rows[i][COL.TICKET_ID] || "";
      const match = tid.match(/TKT(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return "TKT" + String(maxNum + 1).padStart(3, "0");
  } catch (err) {
    console.error("Error generating ticket ID:", err);
    return "TKT001";
  }
}

function rowToTicket(row, rowIndex) {
  return {
    rowIndex,
    ticketId: (row[COL.TICKET_ID] || "").trim(),
    enqNo: (row[COL.ENQ_NO] || "").trim(),
    clientName: (row[COL.CLIENT_NAME] || "").trim(),
    location: (row[COL.LOCATION] || "").trim(),
    raisedBy: (row[COL.RAISED_BY] || "").trim(),
    raisedDate: (row[COL.RAISED_DATE] || "").trim(),
    assignedTo: (row[COL.ASSIGNED_TO] || "").trim(),
    issueDescription: (row[COL.ISSUE_DESC] || "").trim(),
    desiredDate: (row[COL.DESIRED_DATE] || "").trim(),
    status: (row[COL.STATUS] || "Open").trim(),
    confirmedDate: (row[COL.CONFIRMED_DATE] || "").trim(),
    revisedDate: (row[COL.REVISED_DATE] || "").trim(),
    revisionCount: (row[COL.REVISION_COUNT] || "0").trim(),
    revisionHistory: (row[COL.REVISION_HISTORY] || "").trim(),
    completionDate: (row[COL.COMPLETION_DATE] || "").trim(),
    pcRemarks: (row[COL.PC_REMARKS] || "").trim(),
    doerRemarks: (row[COL.DOER_REMARKS] || "").trim(),
    sourceTab: (row[COL.SOURCE_TAB] || "").trim(),
    stepName: (row[COL.STEP_NAME] || "").trim(),
  };
}

// GET /list
router.get("/list", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length <= 1) return res.json({ tickets: [] });

    let tickets = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !(row[COL.TICKET_ID] || "").trim()) continue;
      tickets.push(rowToTicket(row, i + 1));
    }

    const { assignedTo, status, raisedBy } = req.query;
    if (assignedTo) tickets = tickets.filter((t) => t.assignedTo.toLowerCase() === assignedTo.trim().toLowerCase());
    if (status) tickets = tickets.filter((t) => t.status.toLowerCase() === status.trim().toLowerCase());
    if (raisedBy) tickets = tickets.filter((t) => t.raisedBy.toLowerCase() === raisedBy.trim().toLowerCase());

    res.json({ tickets });
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET /my-tickets
router.get("/my-tickets", async (req, res) => {
  try {
    const { userName } = req.query;
    if (!userName) return res.status(400).json({ error: "userName required" });

    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length <= 1) return res.json({ tickets: [] });

    const normalized = userName.trim().toLowerCase();
    const tickets = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !(row[COL.TICKET_ID] || "").trim()) continue;

      const assignedTo = (row[COL.ASSIGNED_TO] || "").trim().toLowerCase();
      const status = (row[COL.STATUS] || "").trim().toLowerCase();

      if (assignedTo === normalized && status !== "completed") {
        tickets.push(rowToTicket(row, i + 1));
      }
    }

    res.json({ tickets });
  } catch (err) {
    console.error("Error fetching my tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// POST /create
router.post("/create", async (req, res) => {
  try {
    const { enqNo, clientName, location, raisedBy, assignedTo, issueDescription, desiredDate, sourceTab, stepName } = req.body;

    if (!enqNo || !assignedTo || !issueDescription || !desiredDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ticketId = await generateTicketId();
    const raisedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const newRow = [
      ticketId,
      (enqNo || "").trim(),
      (clientName || "").trim(),
      (location || "").trim(),
      (raisedBy || "").trim(),
      raisedDate,
      (assignedTo || "").trim(),
      (issueDescription || "").trim(),
      (desiredDate || "").trim(),
      "Open",
      "", "", "0", "", "", "", "",
      (sourceTab || "").trim(),
      (stepName || "").trim(),
    ];

    await appendRow(SHEET_NAME, newRow);
    res.json({ success: true, ticketId, message: "Ticket created successfully" });
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// POST /update — ✅ FIXED
router.post("/update", async (req, res) => {
  try {
    const { rowIndex, status, confirmedDate, revisedDate, pcRemarks, doerRemarks, completionDate } = req.body;

    if (!rowIndex) return res.status(400).json({ error: "rowIndex is required" });

    const rows = await getSheetData(SHEET_NAME);
    const currentRow = rows[rowIndex - 1];
    if (!currentRow) return res.status(404).json({ error: "Ticket not found" });

    const updates = [];

    // ✅ Handle "Date Revision Requested" FIRST
    if (status === "Date Revision Requested" && revisedDate) {
      const currentCount = parseInt((currentRow[COL.REVISION_COUNT] || "0").toString().trim(), 10);
      const newCount = currentCount + 1;
      const currentHistory = (currentRow[COL.REVISION_HISTORY] || "").toString().trim();
      const newHistory = currentHistory ? `${currentHistory}, ${revisedDate}` : revisedDate;

      updates.push({ col: COL.STATUS, val: "Date Revision Requested" });  // ✅ Overwrites "Overdue"
      updates.push({ col: COL.REVISED_DATE, val: revisedDate });
      updates.push({ col: COL.REVISION_COUNT, val: String(newCount) });
      updates.push({ col: COL.REVISION_HISTORY, val: newHistory });
    } else if (status !== undefined) {
      updates.push({ col: COL.STATUS, val: status });

      if (status === "Completed") {
        const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        updates.push({ col: COL.COMPLETION_DATE, val: completionDate || now });
      }
    }

    if (confirmedDate !== undefined) {
      updates.push({ col: COL.CONFIRMED_DATE, val: confirmedDate });
      const currentStatus = (currentRow[COL.STATUS] || "").trim();
      if ((currentStatus === "Open" || currentStatus === "Overdue") && !status) {
        updates.push({ col: COL.STATUS, val: "PC Confirmed" });
      }
    }

    if (revisedDate !== undefined && status !== "Date Revision Requested") {
      updates.push({ col: COL.REVISED_DATE, val: revisedDate });
    }

    if (pcRemarks !== undefined) updates.push({ col: COL.PC_REMARKS, val: pcRemarks });
    if (doerRemarks !== undefined) updates.push({ col: COL.DOER_REMARKS, val: doerRemarks });

    for (const update of updates) {
      const cellRange = `${colLetter(update.col)}${rowIndex}`;
      await updateCell(SHEET_NAME, cellRange, [update.val]);
    }

    res.json({ success: true, message: "Ticket updated successfully" });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// GET /users
router.get("/users", async (req, res) => {
  try {
    const rows = await getSheetData(USER_SHEET);
    if (!rows || rows.length <= 1) return res.json({ users: [] });

    const users = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      users.push({
        id: (row[0] || "").trim(),
        userName: (row[2] || "").trim(),
        role: (row[3] || "").trim(),
      });
    }

    res.json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /overdue — ✅ FIXED
// Only marks as Overdue, but ALSO clears Overdue if revision/confirmation date is now in future
router.get("/overdue", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length <= 1) return res.json({ tickets: [] });

    const now = new Date();
    const overdueTickets = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !(row[COL.TICKET_ID] || "").toString().trim()) continue;

      const status = (row[COL.STATUS] || "").toString().trim();
      const statusLower = status.toLowerCase();

      // Skip completed/rejected
      if (statusLower === "completed" || statusLower === "rejected") continue;

      // Priority: Revised > Confirmed > Desired
      const revisedDateStr = (row[COL.REVISED_DATE] || "").toString().trim();
      const confirmedDateStr = (row[COL.CONFIRMED_DATE] || "").toString().trim();
      const desiredDateStr = (row[COL.DESIRED_DATE] || "").toString().trim();

      const checkDateStr = revisedDateStr || confirmedDateStr || desiredDateStr;
      if (!checkDateStr) continue;

      const dueDate = parseSheetDate(checkDateStr);
      if (!dueDate) continue;

      // ✅ Set END of day — lead is overdue ONLY after the day ends
      dueDate.setHours(23, 59, 59, 999);

      const isPastDue = now > dueDate;

      if (isPastDue) {
        // Mark as Overdue only if currently not Overdue and not in active state
        if (statusLower !== "overdue") {
          const cellRange = `${colLetter(COL.STATUS)}${i + 1}`;
          await updateCell(SHEET_NAME, cellRange, ["Overdue"]);
        }

        overdueTickets.push({
          rowIndex: i + 1,
          ticketId: (row[COL.TICKET_ID] || "").toString().trim(),
          enqNo: (row[COL.ENQ_NO] || "").toString().trim(),
          clientName: (row[COL.CLIENT_NAME] || "").toString().trim(),
          assignedTo: (row[COL.ASSIGNED_TO] || "").toString().trim(),
          desiredDate: desiredDateStr,
          revisedDate: revisedDateStr,
          status: "Overdue",
        });
      } else {
        // ✅ NEW: Date is in future but status is still "Overdue" — RESTORE
        if (statusLower === "overdue") {
          // Determine correct status to restore based on context
          let restoredStatus = "Open";
          const revCount = parseInt((row[COL.REVISION_COUNT] || "0").toString().trim(), 10);

          if (revCount > 0 && revisedDateStr) {
            restoredStatus = "Date Revision Requested";
          } else if (confirmedDateStr) {
            restoredStatus = "PC Confirmed";
          }

          const cellRange = `${colLetter(COL.STATUS)}${i + 1}`;
          await updateCell(SHEET_NAME, cellRange, [restoredStatus]);
        }
      }
    }

    res.json({ tickets: overdueTickets });
  } catch (err) {
    console.error("Error checking overdue:", err);
    res.status(500).json({ error: "Failed to check overdue tickets" });
  }
});

module.exports = router;