

const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEETS = {
  ENQUIRY: "Enquiry Responses",
  PIPELINE: "PIPELINE",
  NOT_QUALIFIED: "NOT QUALIFIED LEADS",
  COLD_LEADS: "COLD LEADS",
  FMS: "FMS",
  REMARKS: "Remarks",
  NEXT_ACTION: "NEXT Action Plan",
  SITE_VISIT_FMS: "SITE VISIT FMS",
  DONE: "DONE",
  PROPOSAL_DONE: "Proposal Done Leads",
  SITE_VISIT_ECS: "SITE VISIT ECS",
  ASSIGNMENT_LOGGER: "Assignment Logger",
};

const ROW7_SHEETS = [SHEETS.FMS, SHEETS.DONE, SHEETS.PROPOSAL_DONE, SHEETS.SITE_VISIT_FMS];

const DEDUP_SHEETS = [
  SHEETS.PIPELINE,
  SHEETS.NOT_QUALIFIED,
  SHEETS.COLD_LEADS,
  SHEETS.FMS,
  SHEETS.SITE_VISIT_FMS,
  SHEETS.DONE,
  SHEETS.PROPOSAL_DONE,
];

const FORMULA_SHEETS = [SHEETS.FMS, SHEETS.PROPOSAL_DONE, SHEETS.SITE_VISIT_FMS];

let sheetsApi = null;

async function getSheets() {
  if (sheetsApi) return sheetsApi;

  let auth;
  if (process.env.GOOGLE_CREDENTIALS) {
    // Production (Vercel): use JSON credentials from env var
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    // Private key ki newlines fix karo
    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  } else {
    // Local development: use credentials.json file
    auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(__dirname, "../credentials.json"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  const client = await auth.getClient();
  sheetsApi = google.sheets({ version: "v4", auth: client });
  return sheetsApi;
}

async function getSheetData(sheetName, range) {
  const sheets = await getSheets();
  const fullRange = range ? `'${sheetName}'!${range}` : `'${sheetName}'`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: fullRange,
  });
  return res.data.values || [];
}

async function findFirstEmptyRow(sheetName) {
  const data = await getSheetData(sheetName, "B:B");
  const startIndex = ROW7_SHEETS.includes(sheetName) ? 7 : 1;

  for (let i = startIndex; i < data.length; i++) {
    const cellValue = (data[i] && data[i][0]) ? data[i][0].toString().trim() : "";
    if (!cellValue) {
      return i + 1;
    }
  }
  return data.length + 1;
}

async function appendRow(sheetName, values) {
  const sheets = await getSheets();

  if (FORMULA_SHEETS.includes(sheetName)) {
    const emptyRow = await findFirstEmptyRow(sheetName);

    function numToCol(num) {
      if (num <= 26) return String.fromCharCode(64 + num);
      return String.fromCharCode(64 + Math.floor((num - 1) / 26)) + String.fromCharCode(65 + ((num - 1) % 26));
    }

    const lastCol = numToCol(values.length);
    const range = `'${sheetName}'!A${emptyRow}:${lastCol}${emptyRow}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: range,
      valueInputOption: "USER_ENTERED",
      resource: { values: [values] },
    });
  } else {
    const startCell = ROW7_SHEETS.includes(sheetName) ? "A7" : "A1";
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${sheetName}'!${startCell}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values: [values] },
    });
  }
}

async function updateCell(sheetName, range, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!${range}`,
    valueInputOption: "USER_ENTERED",
    resource: { values: Array.isArray(values[0]) ? values : [values] },
  });
}

async function getSheetId(sheetName) {
  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === sheetName
  );

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  return sheet.properties.sheetId;
}

async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const sheetId = await getSheetId(sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

async function clearRow(sheetName, rowIndex, endColumn = "AZ") {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!A${rowIndex}:${endColumn}${rowIndex}`,
  });
}

async function getEnqNosFromSheet(sheetName) {
  try {
    const data = await getSheetData(sheetName, "B:B");
    const skipRows = ROW7_SHEETS.includes(sheetName) ? 6 : 1;
    return data.slice(skipRows).map((row) => (row[0] || "").trim());
  } catch (err) {
    console.error(`Error reading ${sheetName}:`, err.message);
    return [];
  }
}

async function findRowByEnqNo(sheetName, enqNo) {
  const data = await getSheetData(sheetName);
  const startRow = ROW7_SHEETS.includes(sheetName) ? 6 : 1;
  for (let i = startRow; i < data.length; i++) {
    if ((data[i][1] || "").trim() === enqNo.trim()) {
      return i + 1;
    }
  }
  return -1;
}

module.exports = {
  SHEETS,
  DEDUP_SHEETS,
  getSheetData,
  appendRow,
  updateCell,
  deleteRow,
  clearRow,
  getEnqNosFromSheet,
  findRowByEnqNo,
  getSheetId,
};