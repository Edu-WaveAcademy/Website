// Sheet storage uses actual workbook headers and writes only supplied fields.

function ensureHeaders_(name) {
  var sh = sheet_(name, true),
    wanted = HEADERS[name];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, wanted.length).setValues([wanted]);
    return;
  }
  var current = sh
      .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
      .getDisplayValues()[0],
    missing = wanted.filter(function (h) {
      return current.indexOf(h) === -1;
    });
  if (missing.length)
    sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
}

function clearData_(name) {
  var sh = sheet_(name, false),
    last = sh.getLastRow();
  if (last > 1)
    sh.getRange(2, 1, last - 1, Math.max(1, sh.getLastColumn())).clearContent();
}

function replaceData_(name, items) {
  var sh = sheet_(name, false),
    headers = sheetHeaders_(sh, name),
    last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, headers.length).clearContent();
  if (items.length)
    sh.getRange(2, 1, items.length, headers.length).setValues(
      items.map(function (item) {
        return recordValues_(headers, item);
      })
    );
}

function sheet_(name, create) {
  var ss = SpreadsheetApp.getActive(),
    sh = ss.getSheetByName(name);
  if (!sh && create) sh = ss.insertSheet(name);
  if (!sh)
    throw new Error(
      'Missing portal tab: ' + name + '. Run setupEduwave() once.'
    );
  return sh;
}

function rows_(name) {
  var sh = sheet_(name, false),
    v = sh.getDataRange().getDisplayValues();
  if (v.length < 2) return [];
  var h = v[0];
  return v
    .slice(1)
    .map(function (r, i) {
      if (
        !r.some(function (x) {
          return x !== '';
        })
      )
        return null;
      var o = { _row: i + 2 };
      h.forEach(function (k, j) {
        o[k] = r[j] || '';
      });
      return o;
    })
    .filter(Boolean);
}

function first_(name, p) {
  return rows_(name).filter(p)[0] || null;
}

function append_(name, record) {
  var sh = sheet_(name, false);
  sh.appendRow(recordValues_(sheetHeaders_(sh, name), record));
}

function update_(name, row, values) {
  var sh = sheet_(name, false),
    headers = sheetHeaders_(sh, name),
    start = -1,
    pending = [];
  // Write only supplied fields, grouping adjacent cells into one service call.
  // Untouched formulas and extension columns must never be rewritten as text.
  function flush() {
    if (pending.length)
      sh.getRange(row, start + 1, 1, pending.length).setValues([pending]);
    start = -1;
    pending = [];
  }
  headers.forEach(function (key, index) {
    if (values[key] === undefined) {
      flush();
      return;
    }
    if (start === -1) start = index;
    pending.push(values[key]);
  });
  flush();
}

// HEADERS defines required fields; the workbook header row defines their order.
function sheetHeaders_(sh, name) {
  var headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getDisplayValues()[0];
  var missing = HEADERS[name].filter(function (key) {
    return headers.indexOf(key) === -1;
  });
  if (missing.length)
    throw new Error(
      'Missing portal columns in ' +
        name +
        ': ' +
        missing.join(', ') +
        '. Run setupEduwave() once.'
    );
  return headers;
}

function setConfigDefault_(k, v) {
  if (!getConfig_(k)) setConfig_(k, v);
}

function getConfig_(k) {
  var r = first_(PORTAL.config, function (x) {
    return x.key === k;
  });
  return r ? r.value : '';
}

function setConfig_(k, v) {
  var r = first_(PORTAL.config, function (x) {
      return x.key === k;
    }),
    o = { key: k, value: v, updated_at: stamp_() };
  if (r) update_(PORTAL.config, r._row, o);
  else append_(PORTAL.config, o);
}

function audit_(at, ai, event, et, ei, detail) {
  append_(PORTAL.audit, {
    event_id: id_('LOG'),
    actor_type: at,
    actor_id: ai,
    event: event,
    entity_type: et,
    entity_id: ei,
    detail: detail,
    created_at: stamp_()
  });
}
