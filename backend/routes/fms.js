const express = require("express");
const router = express.Router();
const {
  SHEETS,
  getSheetData,
  updateCell,
  appendRow,
  deleteRow,
} = require("../utils/sheets");
const { uploadFileToDrive, createDriveFolder } = require("../utils/drive");

const SHEET_NAME = SHEETS.FMS;

// Column mapping (0-indexed) - FMS sheet
const COL = {
  TIMESTAMP: 0, // A
  ENQ_NO: 1, // B
  LEAD_FROM: 2, // C
  CLIENT_NAME: 3, // D
  PARTNER_TYPE: 4, // E
  PURPOSE: 5, // F
  LOCATION: 6, // G
  CONTACT_INFO: 7, // H
  CONCERN_PERSON: 8, // I
  PLANNED: 9, // J
  ACTUAL: 10, // K
  STATUS: 11, // L
  // M = Time Delay (formula, skip)
  MAP_LOCATION: 13, // N
  AKS: 14, // O
  KHASRA: 15, // P
  OLD_DOCUMENT: 16, // Q
  LAND_SURVEY: 17, // R
  // ... other columns ...
  PDF_FOLDER: 26, // AA (index 26)
};

// Helper: column index to letter
function colLetter(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  return (
    String.fromCharCode(64 + Math.floor(index / 26)) +
    String.fromCharCode(65 + (index % 26))
  );
}

// Helper: get current timestamp in IST
function getCurrentTimestamp() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// ============================================
// GET /api/fms/list - All FMS leads
// ============================================
router.get("/list", async (req, res) => {
  try {
    const data = await getSheetData(SHEET_NAME);
    if (data.length <= 6) {
      return res.json({ leads: [] });
    }

    const leads = [];
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[COL.ENQ_NO]) continue;

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
        planned: row[COL.PLANNED] || "",
        actual: row[COL.ACTUAL] || "",
        status: row[COL.STATUS] || "",
        mapLocation: row[COL.MAP_LOCATION] || "",
        aks: row[COL.AKS] || "",
        khasra: row[COL.KHASRA] || "",
        oldDocument: row[COL.OLD_DOCUMENT] || "",
        landSurvey: row[COL.LAND_SURVEY] || "",
        pdfFolder: row[COL.PDF_FOLDER] || "",
      });
    }

    res.json({ leads });
  } catch (err) {
    console.error("FMS list error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch FMS", details: err.message });
  }
});

// ============================================
// GET /api/fms/step2 - Step 2 leads (Planned not empty, Actual empty)
// ============================================
router.get("/step2", async (req, res) => {
  try {
    const data = await getSheetData(SHEET_NAME);
    if (data.length <= 6) {
      return res.json({ leads: [] });
    }

    const leads = [];
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[COL.ENQ_NO]) continue;

      const planned = (row[COL.PLANNED] || "").trim();
      const actual = (row[COL.ACTUAL] || "").trim();

      // Show only if Planned is filled and Actual is empty
      if (planned && !actual) {
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
          planned: planned,
          actual: actual,
          status: row[COL.STATUS] || "",
          mapLocation: row[COL.MAP_LOCATION] || "",
          aks: row[COL.AKS] || "",
          khasra: row[COL.KHASRA] || "",
          oldDocument: row[COL.OLD_DOCUMENT] || "",
          landSurvey: row[COL.LAND_SURVEY] || "",
          pdfFolder: row[COL.PDF_FOLDER] || "",
        });
      }
    }

    res.json({ leads });
  } catch (err) {
    console.error("FMS step2 error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch Step 2 leads", details: err.message });
  }
});

// ============================================
// POST /api/fms/step2/update
// Handles BOTH:
//   1. Status = "Done" → Create folder, upload documents
//   2. Status = "Cold Lead" / "Back to Pipeline" / "Not Qualified Lead" → Move to another sheet
// ============================================
router.post("/step2/update", async (req, res) => {
  try {
    const {
      rowIndex,
      enqNo,
      location,
      clientName,
      mapLocation,
      status,
      remark,
    } = req.body;

    if (!rowIndex || !enqNo) {
      return res.status(400).json({
        success: false,
        error: "rowIndex and enqNo are required",
      });
    }

    // =============================
    // CASE 1: STATUS = DONE
    // (Folder creation + file upload preparation)
    // =============================
    if (!status || status === "Done") {
      // Create folder name: ClientName(Location)
      const folderName = `${clientName || "Unknown"}(${location || ""})`;

      // Create folder in Google Drive
      const parentFolderId = "0AKlw__VHWUaAUk9PVA";
      const folder = await createDriveFolder(folderName, parentFolderId);
      const folderLink = `https://drive.google.com/drive/folders/${folder.id}`;

      const currentDateTime = getCurrentTimestamp();

      // Update Actual (K), Status (L), PDF Folder (AA)
      await updateCell(SHEET_NAME, `${colLetter(COL.ACTUAL)}${rowIndex}`, [
        currentDateTime,
      ]);
      await updateCell(SHEET_NAME, `${colLetter(COL.STATUS)}${rowIndex}`, [
        "Done",
      ]);
      await updateCell(SHEET_NAME, `${colLetter(COL.PDF_FOLDER)}${rowIndex}`, [
        folderLink,
      ]);

      // Update Map Location (N) if provided
      if (mapLocation && mapLocation.trim()) {
        await updateCell(
          SHEET_NAME,
          `${colLetter(COL.MAP_LOCATION)}${rowIndex}`,
          [mapLocation.trim()],
        );
      }

      return res.json({
        success: true,
        message: "Step 2 completed",
        folderId: folder.id,
        folderLink: folderLink,
      });
    }

    // =============================
    // CASE 2: MOVE TO OTHER SHEETS
    // (Cold Lead / Back to Pipeline / Not Qualified Lead)
    // =============================
    const validMoveStatuses = ["Cold Lead", "Back to Pipeline", "Not Qualified Lead"];
    if (!validMoveStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status for move operation",
      });
    }

    // Get the lead data
    const data = await getSheetData(SHEET_NAME);
    const row = data[rowIndex - 1]; // Convert to 0-indexed

    if (!row || row[COL.ENQ_NO] !== enqNo) {
      return res.status(400).json({
        success: false,
        error: "Lead not found or EnQ No mismatch",
      });
    }

    // Prepare data for destination (A-I + Status J + Remark K)
    const leadData = [
      getCurrentTimestamp(),         // A - Current timestamp
      row[COL.ENQ_NO] || "",         // B
      row[COL.LEAD_FROM] || "",      // C
      row[COL.CLIENT_NAME] || "",    // D
      row[COL.PARTNER_TYPE] || "",   // E
      row[COL.PURPOSE] || "",        // F
      row[COL.LOCATION] || "",       // G
      row[COL.CONTACT_INFO] || "",   // H
      row[COL.CONCERN_PERSON] || "", // I
      "",                            // J - Status (blank)
      remark || "",                  // K - Remark
    ];

    // Determine destination sheet
    let destSheet;
    switch (status) {
      case "Cold Lead":
        destSheet = SHEETS.COLD_LEADS;
        break;
      case "Back to Pipeline":
        destSheet = SHEETS.PIPELINE;
        break;
      case "Not Qualified Lead":
        destSheet = SHEETS.NOT_QUALIFIED;
        break;
    }

    // Append to destination sheet
    await appendRow(destSheet, leadData);

    // Delete from FMS
    await deleteRow(SHEET_NAME, rowIndex);

    return res.json({
      success: true,
      message: `Lead moved to ${status === "Back to Pipeline" ? "Pipeline" : status}`,
      movedTo: destSheet,
    });
  } catch (err) {
    console.error("FMS step2 update error:", err);
    res.status(500).json({
      success: false,
      error: "Update failed",
      details: err.message,
    });
  }
});

// ============================================
// POST /api/fms/upload - Upload file to Drive and update sheet column
// ============================================
router.post("/upload", async (req, res) => {
  try {
    const { rowIndex, folderId, columnIndex, fileName, fileBase64, mimeType } =
      req.body;

    if (!rowIndex || !folderId || columnIndex === undefined || !fileBase64) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Upload file to the folder
    const file = await uploadFileToDrive(
      fileName,
      fileBase64,
      mimeType,
      folderId,
    );
    const fileLink = `https://drive.google.com/file/d/${file.id}/view`;

    // Update the specific column with file link
    await updateCell(SHEET_NAME, `${colLetter(columnIndex)}${rowIndex}`, [
      fileLink,
    ]);

    res.json({
      success: true,
      fileId: file.id,
      fileLink: fileLink,
    });
  } catch (err) {
    console.error("FMS upload error:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// ============================================
// Sub-route mounting
// ============================================
const step3Routes = require("./fms/steps/step3");
router.use("/step3", step3Routes);

const step4Routes = require("./fms/steps/step4");
router.use("/step4", step4Routes);

const step5Routes = require("./fms/steps/step5");
router.use("/step5", step5Routes);

const step6Routes = require("./fms/steps/step6");
router.use("/step6", step6Routes);

const step7Routes = require("./fms/steps/step7");
router.use("/step7", step7Routes);

const proposalHoldRoutes = require("./fms/steps/proposalHold");
router.use("/proposal-hold", proposalHoldRoutes);

module.exports = router;