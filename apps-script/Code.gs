/**
 * New Launches CRM: Google Sheets backend.
 *
 * Setup (5 minutes):
 *  1. Create a Google Sheet, then Extensions > Apps Script. Replace everything with this file.
 *  2. Change TOKEN below to any long secret, and put the SAME value in Vercel as SHEETS_API_TOKEN.
 *  3. Select the "setup" function in the toolbar and click Run (accept the permissions once).
 *     This creates the Launches, Placements and History tabs.
 *  4. Deploy > New deployment > type "Web app" > Execute as: Me > Who has access: Anyone > Deploy.
 *     Copy the Web app URL into Vercel as SHEETS_API_URL, then redeploy the Vercel project.
 *  After editing this script later: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.
 *
 * The sheet stays readable: one row per request / placement / history entry. You can edit cells by hand,
 * but keep the header row and the "id" column as they are.
 */

const TOKEN = 'CHANGE-ME'; // same value as SHEETS_API_TOKEN in Vercel

const TABLES = {
  Launches: ['id', 'name', 'level', 'launch_type', 'category', 'kam', 'requested_go_live', 'stock_ready',
    'landing_page', 'offer', 'hero_skus', 'commercial_comments', 'decision', 'confirmed_go_live', 'm2_p1_week',
    'm3_p1_week', 'marketing_owner', 'marketing_comments', 'created_by', 'updated_by', 'created_at', 'updated_at'],
  Placements: ['id', 'launch_id', 'date', 'channel', 'time', 'details', 'status', 'owner', 'created_by', 'created_at'],
  History: ['id', 'launch_id', 'launch_name', 'actor', 'action', 'details', 'at'],
};

// ---------------------------------------------------------------- entry points
function doGet(e) {
  return handle_(Object.assign({ action: 'health' }, (e && e.parameter) || {}));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return out_({ ok: false, error: 'Request body is not valid JSON' });
  }
  return handle_(body);
}

/** Run once from the editor: creates the tabs and formats them. */
function setup() {
  setup_();
  return 'Tabs ready: ' + Object.keys(TABLES).join(', ');
}

// ---------------------------------------------------------------- routing
function handle_(req) {
  if (TOKEN === 'CHANGE-ME') return out_({ ok: false, error: 'Set TOKEN at the top of the Apps Script, then deploy a new version.' });
  if (req.token !== TOKEN) return out_({ ok: false, error: 'Unauthorized: SHEETS_API_TOKEN does not match TOKEN in the Apps Script.' });
  var writes = req.action === 'insert' || req.action === 'update' || req.action === 'delete';
  var lock = writes ? LockService.getScriptLock() : null;
  if (lock) lock.waitLock(25000);
  try {
    setup_();
    return out_(Object.assign({ ok: true }, route_(req)));
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    if (lock) lock.releaseLock();
  }
}

function route_(req) {
  switch (req.action) {
    case 'health':
      return {
        spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
        counts: {
          launches: read_('Launches').length,
          placements: read_('Placements').length,
          history: read_('History').length,
        },
      };
    case 'all':
      var hist = read_('History');
      var limit = Number(req.historyLimit || 500);
      return {
        launches: read_('Launches'),
        placements: read_('Placements'),
        history: hist.slice(Math.max(0, hist.length - limit)),
      };
    case 'insert': {
      table_(req.table);
      var ids = insert_(req.table, req.rows || []);
      if (req.log) log_(req.log, req.table === 'Launches' ? ids[0] : null);
      return { ids: ids };
    }
    case 'update': {
      table_(req.table);
      var n = update_(req.table, Number(req.id), req.patch || {});
      if (n && req.log) log_(req.log, null);
      return { updated: n };
    }
    case 'delete': {
      table_(req.table);
      var id = Number(req.id);
      if (req.log) log_(req.log, null);
      var d = remove_(req.table, function (r) { return Number(r.id) === id; });
      if (req.table === 'Launches') {
        remove_('Placements', function (r) { return Number(r.launch_id) === id; });
        clearHistoryLink_(id);
      }
      return { deleted: d };
    }
    default:
      throw new Error('Unknown action: ' + req.action);
  }
}

// ---------------------------------------------------------------- sheet helpers
function table_(name) {
  if (!TABLES[name]) throw new Error('Unknown table: ' + name);
}

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function setup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(function (name) {
    var cols = TABLES[name];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // keep everything as plain text
      return;
    }
    // add any missing column (keeps sheets created by older versions working)
    var header = headerOf_(sh);
    cols.forEach(function (c) {
      if (header.indexOf(c) === -1) {
        var col = sh.getLastColumn() + 1;
        sh.getRange(1, col).setValue(c).setFontWeight('bold');
        sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
        header.push(c);
      }
    });
  });
}

function headerOf_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol === 0) return [];
  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
}

function cell_(v) {
  if (v instanceof Date) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    var hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
    return Utilities.formatDate(v, tz, hasTime ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v);
}

/** All rows of a tab as objects keyed by header (row = sheet row number). */
function readRaw_(name) {
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  var header = headerOf_(sh);
  if (lastRow < 2) return { sh: sh, header: header, rows: [] };
  var values = sh.getRange(2, 1, lastRow - 1, header.length).getValues();
  var rows = [];
  values.forEach(function (v, i) {
    var o = { _row: i + 2 };
    header.forEach(function (h, j) { if (h) o[h] = cell_(v[j]); });
    if (o.id !== '') rows.push(o);
  });
  return { sh: sh, header: header, rows: rows };
}

function read_(name) {
  return readRaw_(name).rows.map(function (r) {
    var o = {};
    TABLES[name].forEach(function (c) { o[c] = r[c] === undefined ? '' : r[c]; });
    return o;
  });
}

function insert_(name, rows) {
  if (!rows.length) return [];
  var raw = readRaw_(name);
  var next = raw.rows.reduce(function (m, r) { return Math.max(m, Number(r.id) || 0); }, 0) + 1;
  var now = new Date().toISOString();
  var ids = [];
  var matrix = rows.map(function (r) {
    var id = next++;
    ids.push(id);
    var full = Object.assign({}, r, { id: id });
    if (raw.header.indexOf('created_at') !== -1 && !full.created_at) full.created_at = now;
    if (raw.header.indexOf('updated_at') !== -1 && !full.updated_at) full.updated_at = now;
    if (name === 'History' && !full.at) full.at = now;
    return raw.header.map(function (h) { return cell_(full[h]); });
  });
  var start = Math.max(raw.sh.getLastRow(), 1) + 1;
  raw.sh.getRange(start, 1, matrix.length, raw.header.length).setNumberFormat('@').setValues(matrix);
  return ids;
}

function update_(name, id, patch) {
  var raw = readRaw_(name);
  var row = raw.rows.filter(function (r) { return Number(r.id) === id; })[0];
  if (!row) return 0;
  var p = Object.assign({}, patch);
  delete p.id;
  if (raw.header.indexOf('updated_at') !== -1) p.updated_at = new Date().toISOString();
  var current = raw.header.map(function (h) { return row[h] === undefined ? '' : row[h]; });
  raw.header.forEach(function (h, j) { if (Object.prototype.hasOwnProperty.call(p, h)) current[j] = cell_(p[h]); });
  raw.sh.getRange(row._row, 1, 1, raw.header.length).setNumberFormat('@').setValues([current]);
  return 1;
}

function remove_(name, test) {
  var raw = readRaw_(name);
  var rows = raw.rows.filter(test).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
  rows.forEach(function (r) { raw.sh.deleteRow(r); });
  return rows.length;
}

function clearHistoryLink_(launchId) {
  var raw = readRaw_('History');
  var col = raw.header.indexOf('launch_id') + 1;
  raw.rows.forEach(function (r) {
    if (Number(r.launch_id) === launchId) raw.sh.getRange(r._row, col).setValue('');
  });
}

function log_(log, newLaunchId) {
  insert_('History', [{
    launch_id: log.launch_id || newLaunchId || '',
    launch_name: log.launch_name || '',
    actor: log.actor || '',
    action: log.action || '',
    details: log.details || '',
  }]);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
