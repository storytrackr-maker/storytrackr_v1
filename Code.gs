// Code.gs — ASM Roster Google Apps Script
// Deploy as Web App: Execute as Me, Anyone can access
// After changes: Deploy → Manage Deployments → edit the existing deployment
// to point at the NEW version (do NOT create a brand-new deployment URL).

// ── COLUMN MAP ──────────────────────────────────────────────────────────────
// IMPORTANT: these must match the actual Google Sheet column order.
const COL = {
  name:                    1,  // A
  photoUrl:                2,  // B  ← photo link lives here
  connected:               3,  // C  "Family Connected" | "Not Connected"
  date:                    4,  // D  last interaction date
  notes:                   5,  // E
  grade:                   6,  // F
  school:                  7,  // G
  birthday:                8,  // H  MM/DD/YYYY
  interest:                9,  // I  group / sport
  primaryGoal:            10,  // J
  goals:                  11,  // K  JSON array [{text,done,primary,createdAt}]
  lastInteractionSummary: 12,  // L  (written by addInteraction)
  lastLeader:             13,  // M  (written by addInteraction)
  interactionCount:       14,  // N  (written by addInteraction)
  section:                15,  // O  "core" | "loose" | "fringe"
  interactionLog:         16,  // P  JSON array of all hangout entries
};

// Sheet tabs must be named exactly "High School" and "Middle School".
const SHEETS = { hs: 'High School', ms: 'Middle School' };

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    // Reject requests that don't carry the Worker shared secret.
    // Set WORKER_SECRET in Apps Script → Project Settings → Script Properties.
    // Leave it unset to disable the check during initial setup.
    const expected = PropertiesService.getScriptProperties().getProperty('WORKER_SECRET') || '';
    if (expected && (e.parameter._s || '') !== expected) {
      return json({ error: 'Unauthorized' });
    }

    const action  = e.parameter.action;
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};

    let result;
    if      (action === 'read')               result = readRoster();
    else if (action === 'add')                result = addRow(payload);
    else if (action === 'update')             result = updateRow(payload);
    else if (action === 'delete')             result = deleteRow(payload);
    else if (action === 'addInteraction')     result = addInteraction(payload);
    else if (action === 'updateInteraction')  result = updateInteractionEntry(payload);
    else if (action === 'deleteInteraction')  result = deleteInteractionEntry(payload);
    else                                       result = { error: 'Unknown action: ' + action };

    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const expected = PropertiesService.getScriptProperties().getProperty('WORKER_SECRET') || '';
    if (expected && (body._s || '') !== expected) {
      return json({ error: 'Unauthorized' });
    }
    const action = body.action;

    let result;
    if (action === 'uploadPhoto') result = uploadPhoto(body);
    else                          result = { error: 'Unknown action: ' + action };

    return json(result);
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── READ ─────────────────────────────────────────────────────────────────────
function readRoster() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const result = {
    hs: { core: [], loose: [], fringe: [] },
    ms: { core: [], loose: [], fringe: [] },
  };

  Object.entries(SHEETS).forEach(function(entry) {
    var sk = entry[0], sheetName = entry[1];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const rows = sheet.getDataRange().getValues();
    rows.forEach(function(row, i) {
      if (i === 0) return;                   // skip header row
      if (!row[COL.name - 1]) return;        // skip blank rows

      const section = (row[COL.section - 1] || 'core').toString().toLowerCase().trim();
      if (!result[sk][section]) return;      // skip unknown sections

      let goals = [];
      try { goals = JSON.parse(row[COL.goals - 1] || '[]'); } catch (_) {}

      result[sk][section].push({
        name:     row[COL.name     - 1],
        photoUrl: row[COL.photoUrl - 1],
        connected: row[COL.connected - 1] === 'Family Connected',
        date:     row[COL.date     - 1],
        notes:    row[COL.notes    - 1],
        grade:    row[COL.grade    - 1],
        school:   row[COL.school   - 1],
        birthday: row[COL.birthday - 1],
        interest: row[COL.interest - 1],
        primaryGoal: row[COL.primaryGoal - 1],
        goals,
        rowIndex: i + 1,  // 1-based sheet row number
      });
    });
  });

  return result;
}

// ── ADD ROW ───────────────────────────────────────────────────────────────────
function addRow(payload) {
  const { sheet: sk, section, person } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  const row = new Array(COL.interactionLog).fill('');
  row[COL.name        - 1] = person.name           || '';
  row[COL.photoUrl    - 1] = person.photoUrl        || '';
  row[COL.connected   - 1] = person.connected ? 'Family Connected' : 'Not Connected';
  row[COL.date        - 1] = person.date            || '';
  row[COL.notes       - 1] = person.notes           || '';
  row[COL.grade       - 1] = person.grade           || '';
  row[COL.school      - 1] = person.school          || '';
  row[COL.birthday    - 1] = person.birthday        || '';
  row[COL.interest    - 1] = person.interest        || '';
  row[COL.primaryGoal - 1] = person.primaryGoal     || '';
  row[COL.goals       - 1] = JSON.stringify(person.goals || []);
  row[COL.section     - 1] = section                || 'core';
  row[COL.interactionLog - 1] = '[]';

  sheetObj.appendRow(row);
  return { success: true, newRowIndex: sheetObj.getLastRow() };
}

// ── UPDATE ROW ────────────────────────────────────────────────────────────────
function updateRow(payload) {
  const { sheet: sk, rowIndex, fields } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  const colMap = {
    name:        COL.name,
    photoUrl:    COL.photoUrl,
    connected:   COL.connected,
    date:        COL.date,
    notes:       COL.notes,
    grade:       COL.grade,
    school:      COL.school,
    birthday:    COL.birthday,
    interest:    COL.interest,
    primaryGoal: COL.primaryGoal,
    goals:       COL.goals,
    section:     COL.section,
  };

  Object.entries(fields).forEach(function(entry) {
    var key = entry[0], value = entry[1];
    const col = colMap[key];
    if (!col) return;

    let cellValue = value;
    if (key === 'connected') cellValue = value ? 'Family Connected' : 'Not Connected';
    if (key === 'goals' && typeof value !== 'string') cellValue = JSON.stringify(value);

    sheetObj.getRange(rowIndex, col).setValue(cellValue);
  });

  return { success: true };
}

// ── DELETE ROW ────────────────────────────────────────────────────────────────
function deleteRow(payload) {
  const { sheet: sk, rowIndex } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  sheetObj.deleteRow(rowIndex);
  return { success: true };
}

// ── ADD INTERACTION ───────────────────────────────────────────────────────────
function addInteraction(payload) {
  const { sheet: sk, rowIndex, interaction } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  // Update summary columns (L, M, D, N)
  sheetObj.getRange(rowIndex, COL.lastInteractionSummary).setValue(interaction.summary || '');
  sheetObj.getRange(rowIndex, COL.lastLeader).setValue(interaction.leader || '');
  if (interaction.date) sheetObj.getRange(rowIndex, COL.date).setValue(interaction.date);
  const prev = parseInt(sheetObj.getRange(rowIndex, COL.interactionCount).getValue()) || 0;
  sheetObj.getRange(rowIndex, COL.interactionCount).setValue(prev + 1);

  // Append to full hangout log in column P
  let log = [];
  try { log = JSON.parse(sheetObj.getRange(rowIndex, COL.interactionLog).getValue() || '[]'); } catch (_) {}
  log.push(interaction);
  sheetObj.getRange(rowIndex, COL.interactionLog).setValue(JSON.stringify(log));

  return { success: true };
}

// ── UPDATE INTERACTION ENTRY ──────────────────────────────────────────────────
function updateInteractionEntry(payload) {
  const { sheet: sk, rowIndex, interactionId, changes } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  let log = [];
  try { log = JSON.parse(sheetObj.getRange(rowIndex, COL.interactionLog).getValue() || '[]'); } catch (_) {}

  const idx = log.findIndex(function(n) { return n.id === interactionId; });
  if (idx < 0) return { error: 'Interaction not found' };

  log[idx] = Object.assign({}, log[idx], changes, { updatedAt: new Date().toISOString() });

  // Keep lastInteractionSummary in sync if this was the most recent entry
  if (log[log.length - 1] && log[log.length - 1].id === interactionId) {
    sheetObj.getRange(rowIndex, COL.lastInteractionSummary).setValue(changes.summary || log[idx].summary || '');
  }

  sheetObj.getRange(rowIndex, COL.interactionLog).setValue(JSON.stringify(log));
  return { success: true };
}

// ── DELETE INTERACTION ENTRY ──────────────────────────────────────────────────
function deleteInteractionEntry(payload) {
  const { sheet: sk, rowIndex, interactionId } = payload;
  const sheetObj = getSheet(sk);
  if (!sheetObj) return { error: 'Sheet not found: ' + sk };

  let log = [];
  try { log = JSON.parse(sheetObj.getRange(rowIndex, COL.interactionLog).getValue() || '[]'); } catch (_) {}

  const filtered = log.filter(function(n) { return n.id !== interactionId; });
  sheetObj.getRange(rowIndex, COL.interactionLog).setValue(JSON.stringify(filtered));

  // Keep summary columns in sync with the new most-recent entry
  const last = filtered[filtered.length - 1];
  sheetObj.getRange(rowIndex, COL.lastInteractionSummary).setValue(last ? last.summary || '' : '');
  sheetObj.getRange(rowIndex, COL.lastLeader).setValue(last ? last.leader || '' : '');
  sheetObj.getRange(rowIndex, COL.interactionCount).setValue(filtered.length);

  return { success: true };
}

// ── UPLOAD PHOTO ──────────────────────────────────────────────────────────────
function uploadPhoto(body) {
  const { fileName, mimeType, base64, folderId } = body;
  try {
    const folder = DriveApp.getFolderById(folderId);
    const blob   = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    const file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: 'https://drive.google.com/file/d/' + file.getId() + '/view' };
  } catch (err) {
    return { error: err.message };
  }
}

// ── SETUP (run once after pasting this file) ──────────────────────────────────
// Opens the sheet, ensures "High School" and "Middle School" tabs exist, writes headers.
function setupColumns() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const headers = [
    'Student', 'Link to Photo', 'Connected This Quarter', 'DATE', 'Notes',
    'Grade', 'School', 'Birthday', 'Group, Sport', 'Primary Goal',
    'Goals (JSON)', 'Last Interaction Summary', 'Last Leader',
    'Interaction Count', 'Section', 'Hangout Log (JSON)',
  ];

  Object.values(SHEETS).forEach(function(name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert('Sheets ready! High School and Middle School tabs created/updated.');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getSheet(sk) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const name = SHEETS[(sk || '').toLowerCase()];
  return name ? ss.getSheetByName(name) : null;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
