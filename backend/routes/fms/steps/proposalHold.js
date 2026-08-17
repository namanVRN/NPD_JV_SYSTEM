const express = require("express");
const router = express.Router();
const {
  SHEETS,
  getSheetData,
  updateCell,
  appendRow,
  deleteRow,
} = require("../../../utils/sheets");

const SHEET_NAME = "Proposal Done Leads";

const COL = {
  TIMESTAMP: 0,
  ENQ_NO: 1,
  LEAD_FROM: 2,
  CLIENT_NAME: 3,
  PARTNER_TYPE: 4,
  PURPOSE: 5,
  LOCATION: 6,
  CONTACT_INFO: 7,
  CONCERN_PERSON: 8,

  AKS: 14,
  KHASRA: 15,
  OLD_DOCUMENT: 16,
  LAND_SURVEY: 17,
  PDF_FOLDER: 26,

  STEP4_TYPE_OF_PROJECT: 27,
  STEP4_CAD_FILE: 28,
  STEP4_CALC_LINK: 29,

  STEP6_PLANNED: 35,
  STEP6_ACTUAL: 36,
  STEP6_STATUS: 37,
  STEP6_FOLLOW_COUNTER: 39,
};

function colLetter(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  return String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const dateVal = new Date(dateStr);
  if (isNaN(dateVal.getTime())) return dateStr;
  return dateVal.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function getCurrentTimestamp() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// GET /api/fms/proposal-hold
router.get("/", async (req, res) => {
  try {
    const data = await getSheetData(SHEET_NAME);

    if (data.length <= 6) {
      return res.json({ leads: [] });
    }

    const leads = [];
    for (let i = 6; i < data.length; i++) {
      let row = data[i];
      if (!row || !row[COL.ENQ_NO]) continue;

      while (row.length <= COL.STEP6_FOLLOW_COUNTER) row.push("");

      const planned = (row[COL.STEP6_PLANNED] || "").toString().trim();
      const actual = (row[COL.STEP6_ACTUAL] || "").toString().trim();
      const status = (row[COL.STEP6_STATUS] || "").toString().trim();

      if (planned && !actual && status === "Hold") {
        leads.push({
          rowIndex: i + 1,
          timestamp: row[COL.TIMESTAMP] || "",
          enqNo: row[COL.ENQ_NO] || "",
          leadGeneratedFrom: row[COL.LEAD_FROM] || "",
          clientName: row[COL.CLIENT_NAME] || "",
          partnerType: row[COL.PARTNER_TYPE] || "",
          purpose: row[COL.PURPOSE] || "",
          location: row[COL.LOCATION] || "",
          contactInfo: row[COL.CONTACT_INFO] || "",
          concernPerson: row[COL.CONCERN_PERSON] || "",
          aks: row[COL.AKS] || "",
          khasra: row[COL.KHASRA] || "",
          oldDocument: row[COL.OLD_DOCUMENT] || "",
          landSurvey: row[COL.LAND_SURVEY] || "",
          pdfFolder: row[COL.PDF_FOLDER] || "",
          step4TypeOfProject: row[COL.STEP4_TYPE_OF_PROJECT] || "",
          step4CadFile: row[COL.STEP4_CAD_FILE] || "",
          step4CalcLink: row[COL.STEP4_CALC_LINK] || "",
          step6Planned: planned,
          step6Actual: actual,
          step6Status: status,
          step6FollowCounter: row[COL.STEP6_FOLLOW_COUNTER] || "0",
        });
      }
    }

    res.json({ leads });
  } catch (err) {
    console.error("Proposal Hold list error:", err);
    res.status(500).json({ error: "Failed to fetch Proposal Hold leads", details: err.message });
  }
});

// POST /api/fms/proposal-hold/update
router.post("/update", async (req, res) => {
  try {
    const { rowIndex, enqNo, action, plannedOverride } = req.body;

    if (!rowIndex || !enqNo) {
      return res.status(400).json({ error: "rowIndex and enqNo are required" });
    }

    // Verify row exists
    const data = await getSheetData(SHEET_NAME);
    const row = data[rowIndex - 1];

    if (!row || (row[COL.ENQ_NO] || "").trim() !== enqNo.trim()) {
      return res.status(400).json({ error: "Lead not found or EnQ No mismatch" });
    }

    // ✅ MOVE TO COLD LEADS
    if (action === "Cold Lead") {
      const leadData = [
        getCurrentTimestamp(),
        row[COL.ENQ_NO] || "",
        row[COL.LEAD_FROM] || "",
        row[COL.CLIENT_NAME] || "",
        row[COL.PARTNER_TYPE] || "",
        row[COL.PURPOSE] || "",
        row[COL.LOCATION] || "",
        row[COL.CONTACT_INFO] || "",
        row[COL.CONCERN_PERSON] || "",
        "",
        "",
      ];

      await appendRow(SHEETS.COLD_LEADS, leadData);
      await deleteRow(SHEET_NAME, rowIndex);

      return res.json({
        success: true,
        message: "Lead moved to Cold Leads",
        movedTo: SHEETS.COLD_LEADS,
      });
    }

    // ✅ MOVE TO NOT QUALIFIED
    if (action === "Not Qualified Lead") {
      const leadData = [
        getCurrentTimestamp(),
        row[COL.ENQ_NO] || "",
        row[COL.LEAD_FROM] || "",
        row[COL.CLIENT_NAME] || "",
        row[COL.PARTNER_TYPE] || "",
        row[COL.PURPOSE] || "",
        row[COL.LOCATION] || "",
        row[COL.CONTACT_INFO] || "",
        row[COL.CONCERN_PERSON] || "",
        "",
        "",
      ];

      await appendRow(SHEETS.NOT_QUALIFIED, leadData);
      await deleteRow(SHEET_NAME, rowIndex);

      return res.json({
        success: true,
        message: "Lead moved to Not Qualified Leads",
        movedTo: SHEETS.NOT_QUALIFIED,
      });
    }

    // MOVE TO FOLLOW UP
    if (action === "Move to Follow Up") {
      const currentStatus = (row[COL.STEP6_STATUS] || "").trim();
      if (currentStatus !== "Hold") {
        return res.status(400).json({ error: "Lead is not on Hold" });
      }

      await updateCell(SHEET_NAME, `${colLetter(COL.STEP6_STATUS)}${rowIndex}`, [""]);

      if (plannedOverride && plannedOverride.trim()) {
        await updateCell(
          SHEET_NAME,
          `${colLetter(COL.STEP6_PLANNED)}${rowIndex}`,
          [formatDateTime(plannedOverride)]
        );
      }

      return res.json({
        success: true,
        message: "Lead moved back to Follow Up successfully!",
      });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("Proposal Hold update error:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});

module.exports = router;