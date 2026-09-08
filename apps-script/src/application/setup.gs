// Spreadsheet menu, schema upgrades and explicit legacy archive migration.

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Eduwave Portal')
    .addItem('Create portal tabs safely', 'setupEduwave')
    .addItem('Upgrade protected file uploads', 'upgradeFileUploads')
    .addItem('Authorize login email', 'authorizeEduwaveMail')
    .addItem("Create this month's fee rows", 'generateMonthlyFees')
    .addToUi();
}

function setupEduwave() {
  Object.keys(HEADERS).forEach(ensureHeaders_);
  authSecret_();
  setConfigDefault_('admin_email', 'studywitheduwaveacademy@gmail.com');
  setConfigDefault_('developer_email', 'diwij.narang2001@gmail.com');
  setConfigDefault_('portal_upload_root_id', '');
  setConfigDefault_('resource_upload_folder_id', '');
  setConfigDefault_('submission_upload_folder_id', '');
  setConfigDefault_('upi_id', '');
  setConfigDefault_('academy_name', 'Eduwave Academy');
  audit_(
    'system',
    'setup',
    'setup',
    'workbook',
    SpreadsheetApp.getActive().getId(),
    'Portal tabs, secure email login, and protected manual uploads are ready.'
  );
  try {
    SpreadsheetApp.getActive().toast(
      'Portal tabs, login, and manual uploads are ready.',
      'Eduwave Portal',
      5
    );
  } catch (_) {}
  return { ready: true, auth: 'email_otp', tabs: Object.keys(HEADERS) };
}

function upgradeFileUploads() {
  [
    PORTAL.driveIndex,
    PORTAL.resources,
    PORTAL.submissions,
    PORTAL.config
  ].forEach(ensureHeaders_);
  setConfigDefault_('portal_upload_root_id', '');
  setConfigDefault_('resource_upload_folder_id', '');
  setConfigDefault_('submission_upload_folder_id', '');
  try {
    SpreadsheetApp.getActive().toast(
      'Protected file uploads are ready.',
      'Eduwave Portal',
      5
    );
  } catch (_) {}
  return {
    ready: true,
    resources: HEADERS[PORTAL.resources],
    submissions: HEADERS[PORTAL.submissions]
  };
}

function retireLegacyDriveArchive() {
  [
    PORTAL.driveIndex,
    PORTAL.resources,
    PORTAL.assignments,
    PORTAL.worksheetRows,
    PORTAL.submissions,
    PORTAL.audit,
    PORTAL.config
  ].forEach(ensureHeaders_);
  var indexRows = rows_(PORTAL.driveIndex),
    resources = rows_(PORTAL.resources),
    uploadedByResource = {};
  indexRows.forEach(function (row) {
    if (clean_(row.sync_run_id).toLowerCase() === 'upload' && row.resource_id)
      uploadedByResource[row.resource_id] = true;
  });
  var keptResources = resources.filter(function (row) {
      return (
        !row.drive_id ||
        clean_(row.source).toLowerCase() === 'portal_upload' ||
        uploadedByResource[row.resource_id]
      );
    }),
    keptIds = {},
    removedIds = {},
    resourceById = {};
  keptResources.forEach(function (row) {
    keptIds[row.resource_id] = true;
    resourceById[row.resource_id] = row;
  });
  resources.forEach(function (row) {
    if (!keptIds[row.resource_id]) removedIds[row.resource_id] = true;
  });
  var assignments = rows_(PORTAL.assignments),
    submissions = rows_(PORTAL.submissions),
    keptAssignments = assignments.filter(function (row) {
      return keptIds[row.resource_id];
    }),
    keptAssignmentIds = {};
  keptAssignments.forEach(function (row) {
    keptAssignmentIds[row.assignment_id] = true;
  });
  var keptSubmissions = submissions.filter(function (row) {
    return keptIds[row.resource_id] && keptAssignmentIds[row.assignment_id];
  });
  var keptWorksheetRows = rows_(PORTAL.worksheetRows).filter(function (row) {
    return keptIds[row.resource_id];
  });
  var keptIndex = indexRows.filter(function (row) {
    return (
      keptIds[row.resource_id] &&
      (clean_(row.sync_run_id).toLowerCase() === 'upload' ||
        clean_((resourceById[row.resource_id] || {}).source).toLowerCase() ===
          'portal_upload')
    );
  });
  var obsoleteConfig = {
    drive_root_id: true,
    material_root_id: true,
    material_root_name: true,
    material_refresh_enabled: true,
    material_sync_status: true,
    material_sync_run_id: true,
    material_sync_started_at: true,
    material_last_refresh_at: true,
    material_sync_completed_at: true
  };
  var keptConfig = rows_(PORTAL.config).filter(function (row) {
    return !obsoleteConfig[row.key];
  });
  var keptAudit = rows_(PORTAL.audit).filter(function (row) {
    return (
      clean_(row.entity_type).toLowerCase() !== 'drive' &&
      !removedIds[row.entity_id] &&
      !/^(drive_|material_catalogue)/.test(clean_(row.event))
    );
  });
  replaceData_(PORTAL.resources, keptResources);
  replaceData_(PORTAL.assignments, keptAssignments);
  replaceData_(PORTAL.worksheetRows, keptWorksheetRows);
  replaceData_(PORTAL.submissions, keptSubmissions);
  replaceData_(PORTAL.driveIndex, keptIndex);
  replaceData_(PORTAL.config, keptConfig);
  replaceData_(PORTAL.audit, keptAudit);
  var workbook = SpreadsheetApp.getActive(),
    syncSheet = workbook.getSheetByName('Portal_DriveSync');
  if (syncSheet) workbook.deleteSheet(syncSheet);
  var result = {
    removedResources: resources.length - keptResources.length,
    removedAssignments: assignments.length - keptAssignments.length,
    removedSubmissions: submissions.length - keptSubmissions.length,
    keptManualResources: keptResources.length
  };
  audit_(
    'system',
    'migration',
    'legacy_drive_archive_retired',
    'workbook',
    workbook.getId(),
    JSON.stringify(result)
  );
  try {
    workbook.toast(
      'Old Drive catalogue removed. Manual uploads kept: ' +
        result.keptManualResources +
        '.',
      'Eduwave Portal',
      8
    );
  } catch (_) {}
  return result;
}
