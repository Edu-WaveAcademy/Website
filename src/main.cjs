const createApplication = require('./application.cjs');
createApplication({
  document,
  window,
  EduwaveUI: window.EduwaveUI,
  localStorage,
  sessionStorage,
  crypto,
  fetch: window.fetch.bind(window),
  File,
  FileReader,
  FormData,
  navigator,
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  AbortController: window.AbortController,
  IntersectionObserver: window.IntersectionObserver,
}).start();
