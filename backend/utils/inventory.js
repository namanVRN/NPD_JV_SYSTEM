// backend/utils/inventory.js
const { getSheets } = require('./sheets');

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return isNaN(n) ? null : n;
}

function cleanText(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s.toUpperCase() === 'BLANK' || s.toUpperCase() === 'NA' || s === 'NaN') return '';
  return s;
}

function findCol(headers, fragment) {
  const frag = fragment.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] && String(headers[i]).toLowerCase().indexOf(frag) > -1) return i;
  }
  return -1;
}

function findSectionRow(values, prefix) {
  const p = prefix.toLowerCase();
  for (let i = 0; i < values.length; i++) {
    const v = values[i][0];
    if (v && String(v).trim().toLowerCase().indexOf(p) === 0) return i;
  }
  return -1;
}

function parseUnits(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  
  const idx = {
    sno: findCol(headers, 's.no'),
    unitCode: findCol(headers, 'unit code'),
    project: findCol(headers, 'project name'),
    location: findCol(headers, 'location'),
    mapsLink: findCol(headers, 'google maps'),
    projectType: findCol(headers, 'project type'),
    resCom: findCol(headers, 'residential / commercial'),
    block: findCol(headers, 'block'),
    unitNo: findCol(headers, 'unit no'),
    unitType: findCol(headers, 'type of unit'),
    floor: findCol(headers, 'floor'),
    facing: findCol(headers, 'facing'),
    corner: findCol(headers, 'corner'),
    garden: findCol(headers, 'garden'),
    plotDim: findCol(headers, 'plot dimension'),
    plotArea: findCol(headers, 'plot area'),
    builtup: findCol(headers, 'built-up area'),
    sba: findCol(headers, 'super built-up'),
    carpet: findCol(headers, 'carpet'),
    status: findCol(headers, 'status'),
    rate: findCol(headers, 'rate'),
    remarks: findCol(headers, 'remarks')
  };

  const units = [];
  const rows = values.slice(1);

  rows.forEach(row => {
    const unitCode = cleanText(row[idx.unitCode]);
    if (!unitCode) return;

    const plotArea = parseNumber(row[idx.plotArea]);
    const builtup = parseNumber(row[idx.builtup]);
    const sba = parseNumber(row[idx.sba]);
    const carpet = parseNumber(row[idx.carpet]);

    const area = sba || builtup || plotArea || carpet || null;
    const areaBasis = sba ? 'Super Built-up' : builtup ? 'Built-up' : plotArea ? 'Plot' : carpet ? 'Carpet' : '';
    const rateRaw = cleanText(row[idx.rate]);
    const rate = parseNumber(rateRaw);

    units.push({
      sno: row[idx.sno] || '',
      unitCode: unitCode,
      project: cleanText(row[idx.project]),
      location: cleanText(row[idx.location]),
      mapsLink: cleanText(row[idx.mapsLink]),
      projectType: cleanText(row[idx.projectType]),
      resCom: cleanText(row[idx.resCom]),
      block: cleanText(row[idx.block]),
      unitNo: cleanText(row[idx.unitNo]),
      unitType: cleanText(row[idx.unitType]),
      floor: cleanText(row[idx.floor]),
      facing: cleanText(row[idx.facing]),
      corner: cleanText(row[idx.corner]),
      garden: cleanText(row[idx.garden]),
      plotDim: cleanText(row[idx.plotDim]),
      plotArea: plotArea,
      builtup: builtup,
      sba: sba,
      carpet: carpet,
      area: area,
      areaBasis: areaBasis,
      status: cleanText(row[idx.status]) || 'Unknown',
      rateRaw: rateRaw,
      rate: rate,
      remarks: cleanText(row[idx.remarks])
    });
  });

  return units;
}

function parseProjectMaster(values) {
  if (!values || values.length < 4) return {};
  
  // Exact 0-based row mapping matching Apps Script PROJECT MASTER transposed layout
  const rowMap = {
    name: 3, location: 4, mapsLink: 5, projectType: 6, resCom: 7,
    landArea: 8, builtup: 9, sba: 10, blocks: 11, floors: 12,
    flats: 13, shops: 14, plots: 15, soldCount: 16, availableCount: 17,
    permissions: 18, rera: 19, possession: 20
  };

  const result = {};
  for (let p = 1; p <= 5; p++) {
    if (!values[rowMap.name] || p >= values[rowMap.name].length) continue;
    const name = cleanText(values[rowMap.name][p]);
    if (!name) continue;

    const obj = {};
    Object.keys(rowMap).forEach(key => {
      const r = rowMap[key];
      obj[key] = (r < values.length && values[r] && p < values[r].length) ? cleanText(values[r][p]) : '';
    });
    result[name] = obj;
  }
  return result;
}

function readQuickFacts(values) {
  const start = findSectionRow(values, 'a. project details');
  if (start === -1) return [];
  const facts = [];
  for (let r = start + 1; r < values.length; r++) {
    const label = cleanText(values[r][0]);
    const val = cleanText(values[r][1]);
    if (!label) {
      if (facts.length) break;
      continue;
    }
    if (label.toLowerCase().indexOf('b. project feature') === 0) break;
    if (val) facts.push({ label, value: val });
  }
  return facts;
}

function readAmenities(values) {
  const start = findSectionRow(values, 'e. amenities');
  if (start === -1) return [];
  const items = [];
  for (let r = start + 1; r < values.length; r++) {
    const name = cleanText(values[r][0]);
    if (!name) break;
    if (name.toLowerCase().indexOf('a. project details') === 0) break;
    items.push(name);
  }
  return items;
}

function readLandmarks(values) {
  const start = findSectionRow(values, 'd. landmark distances');
  if (start === -1) return [];
  const items = [];
  for (let r = start + 2; r < values.length; r++) {
    const name = cleanText(values[r][0]);
    if (!name) break;
    if (name.toLowerCase().indexOf('e. amenities') === 0) break;
    const dist = parseNumber(values[r][2]);
    items.push({ name, distanceKm: dist });
  }
  items.sort((a, b) => {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });
  return items;
}

function readFab(values) {
  const start = findSectionRow(values, 'b. project feature');
  if (start === -1) return [];

  let headerRow = -1;
  for (let r = start + 1; r <= start + 3 && r < values.length; r++) {
    const b = values[r][1];
    if (b && String(b).toLowerCase().indexOf('feature') > -1) { headerRow = r; break; }
  }
  if (headerRow === -1) return [];

  const items = [];
  for (let r = headerRow + 1; r < values.length; r++) {
    const feature = cleanText(values[r][1]);
    const num = values[r][0];
    if (!feature && (num === null || num === '')) break;
    if (!feature) continue;

    const top3 = cleanText(values[r][5]).toLowerCase().indexOf('yes') === 0;

    items.push({
      num: num,
      feature: feature,
      advantage: cleanText(values[r][2]),
      benefit: cleanText(values[r][3]),
      proof: cleanText(values[r][4]),
      top3: top3,
      situations: cleanText(values[r][6])
    });
  }
  return items;
}

async function getInventoryDashboardData(spreadsheetId) {
  const sheets = await getSheets();
  
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);

  const ranges = [];
  if (sheetNames.includes('MASTER DATABASE')) ranges.push("'MASTER DATABASE'!A1:Z1000");
  if (sheetNames.includes('PROJECT MASTER')) ranges.push("'PROJECT MASTER'!A1:F21");

  if (ranges.length === 0) {
    throw new Error('Database tabs not found in sheet.');
  }

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges
  });

  const valueRanges = response.data.valueRanges || [];
  const masterValues = valueRanges.find(vr => vr.range.includes('MASTER DATABASE'))?.values || [];
  const projectMasterValues = valueRanges.find(vr => vr.range.includes('PROJECT MASTER'))?.values || [];

  const units = parseUnits(masterValues);
  const projectMaster = parseProjectMaster(projectMasterValues);

  const projectNames = Object.keys(projectMaster);
  const projectDetails = {};

  for (const name of projectNames) {
    const matchedSheetTab = sheetNames.find(s => s.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedSheetTab) {
      try {
        const detailResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${matchedSheetTab}'!A1:H100`
        });
        const values = detailResponse.data.values || [];
        projectDetails[name] = {
          quickFacts: readQuickFacts(values),
          amenities: readAmenities(values),
          landmarks: readLandmarks(values),
          fab: readFab(values)
        };
      } catch (err) {
        console.error(`Error reading tab: ${name}`, err);
      }
    }
  }

  return {
    units,
    projectMaster,
    projectDetails,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { getInventoryDashboardData };