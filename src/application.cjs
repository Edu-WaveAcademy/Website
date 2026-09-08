const { CONFIG, SESSION_KEYS, MAX_UPLOAD_BYTES } = require('./config.cjs');
const createState = require('./state.cjs');
const createFormat = require('./shared/format.cjs');
const createBrowser = require('./infrastructure/browser.cjs');
const createFeedback = require('./shared/feedback.cjs');
const createDialogs = require('./shared/dialogs.cjs');
const createSite = require('./features/site.cjs');
const createAuth = require('./features/auth.cjs');
const createParent = require('./features/parent.cjs');
const createMaterials = require('./features/materials.cjs');
const createAdmin = require('./features/admin/controller.cjs');
const createLearning = require('./features/admin/learning.cjs');
const createFamilies = require('./features/admin/families.cjs');
const createLibrary = require('./features/admin/library.cjs');
const createSubmissions = require('./features/admin/submissions.cjs');

// This is the only module that wires features and browser capabilities together.
module.exports = function createApplication(environment) {
  const {
    document,
    window,
    EduwaveUI,
    localStorage,
    sessionStorage,
    crypto,
    fetch,
    File,
    FileReader,
    FormData,
    navigator,
    setTimeout,
    clearTimeout,
    AbortController,
    IntersectionObserver,
  } = environment;
  const state = createState();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const format = createFormat({});
  const browser = createBrowser({
    CONFIG,
    MAX_UPLOAD_BYTES,
    localStorage,
    crypto,
    fetch,
    File,
    FileReader,
    setTimeout,
    clearTimeout,
    AbortController,
    mimeFromName: (...args) => format.mimeFromName(...args),
  });
  const feedback = createFeedback({ $, EduwaveUI });
  const dialogs = createDialogs({ $, $$, document });
  const site = createSite({
    $,
    $$,
    window,
    EduwaveUI,
    FormData,
    IntersectionObserver,
    api: (...args) => browser.api(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    openDialog: (...args) => dialogs.openDialog(...args),
    closeDialog: (...args) => dialogs.closeDialog(...args),
    syncDialogState: (...args) => dialogs.syncDialogState(...args),
    toggleNotifications: (...args) => dialogs.toggleNotifications(...args),
    parentAuthMode: (...args) => auth.parentAuthMode(...args),
    signupParent: (...args) => auth.signupParent(...args),
    requestLoginCode: (...args) => auth.requestLoginCode(...args),
    verifyLoginCode: (...args) => auth.verifyLoginCode(...args),
    resetAuth: (...args) => auth.resetAuth(...args),
    restoreSessions: (...args) => auth.restoreSessions(...args),
    parentLogout: (...args) => parent.parentLogout(...args),
    adminLogout: (...args) => admin.adminLogout(...args),
    adminPanel: (...args) => admin.adminPanel(...args),
  });
  const auth = createAuth({
    SESSION_KEYS,
    $,
    $$,
    state,
    sessionStorage,
    FormData,
    navigator,
    setTimeout,
    maskEmail: (...args) => format.maskEmail(...args),
    api: (...args) => browser.api(...args),
    device: (...args) => browser.device(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    applyParent: (...args) => parent.applyParent(...args),
    applyAdmin: (...args) => admin.applyAdmin(...args),
  });
  const parent = createParent({
    SESSION_KEYS,
    $,
    $$,
    state,
    document,
    EduwaveUI,
    sessionStorage,
    FormData,
    clean: (...args) => format.clean(...args),
    date: (...args) => format.date(...args),
    api: (...args) => browser.api(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    closeDialog: (...args) => dialogs.closeDialog(...args),
    toggleNotifications: (...args) => dialogs.toggleNotifications(...args),
    resetAuth: (...args) => auth.resetAuth(...args),
    resource: (...args) => materials.resource(...args),
  });
  const materials = createMaterials({
    $,
    $$,
    state,
    EduwaveUI,
    FormData,
    clean: (...args) => format.clean(...args),
    date: (...args) => format.date(...args),
    api: (...args) => browser.api(...args),
    encodeFile: (...args) => browser.encodeFile(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    openDialog: (...args) => dialogs.openDialog(...args),
    refreshParent: (...args) => parent.refreshParent(...args),
  });
  const admin = createAdmin({
    SESSION_KEYS,
    $,
    $$,
    state,
    window,
    sessionStorage,
    FormData,
    clean: (...args) => format.clean(...args),
    options: (...args) => format.options(...args),
    activeStudents: (...args) => format.activeStudents(...args),
    api: (...args) => browser.api(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    closeDialog: (...args) => dialogs.closeDialog(...args),
    resetAuth: (...args) => auth.resetAuth(...args),
    submissionFile: (...args) => materials.submissionFile(...args),
    learningPanel: (...args) => learning.learningPanel(...args),
    renderFamilyDirectory: (...args) =>
      families.renderFamilyDirectory(...args),
    bindFamilyDirectory: (...args) => families.bindFamilyDirectory(...args),
    libraryPanel: (...args) => library.libraryPanel(...args),
    bindMaterialDirectory: (...args) =>
      library.bindMaterialDirectory(...args),
    bindAssignmentAccess: (...args) => library.bindAssignmentAccess(...args),
    adminUploadResource: (...args) => library.adminUploadResource(...args),
    submissionsPanel: (...args) => submissions.submissionsPanel(...args),
    bindSubmissionDirectory: (...args) =>
      submissions.bindSubmissionDirectory(...args),
  });
  const learning = createLearning({
    clean: (...args) => format.clean(...args),
    options: (...args) => format.options(...args),
  });
  const families = createFamilies({
    $,
    $$,
    state,
    clean: (...args) => format.clean(...args),
    api: (...args) => browser.api(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    confirmAdminAction: (...args) => dialogs.confirmAdminAction(...args),
    refreshAdmin: (...args) => admin.refreshAdmin(...args),
  });
  const library = createLibrary({
    $,
    $$,
    state,
    FormData,
    clean: (...args) => format.clean(...args),
    date: (...args) => format.date(...args),
    options: (...args) => format.options(...args),
    activeStudents: (...args) => format.activeStudents(...args),
    api: (...args) => browser.api(...args),
    encodeFile: (...args) => browser.encodeFile(...args),
    setStatus: (...args) => feedback.setStatus(...args),
    setBusy: (...args) => feedback.setBusy(...args),
    notify: (...args) => feedback.notify(...args),
    confirmAdminAction: (...args) => dialogs.confirmAdminAction(...args),
    refreshAdmin: (...args) => admin.refreshAdmin(...args),
  });
  const submissions = createSubmissions({
    $,
    $$,
    state,
    EduwaveUI,
    clean: (...args) => format.clean(...args),
    date: (...args) => format.date(...args),
    submissionMonthKey: (...args) => format.submissionMonthKey(...args),
    adminPanel: (...args) => admin.adminPanel(...args),
  });
  return {
    start: () => document.addEventListener('DOMContentLoaded', site.init),
  };
};
