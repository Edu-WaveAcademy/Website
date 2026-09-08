// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createBrowserAdapters({
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
  mimeFromName,
}) {
  async function api(action, payload = {}) {
    if (CONFIG.apiUrl.startsWith('YOUR_'))
      throw new Error('The portal API URL has not been configured.');
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const r = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!r.ok)
        throw new Error(
          'The portal service is temporarily unavailable. Check the current status before submitting again.',
        );
      const data = await r.json();
      if (!data.ok) {
        if (
          data.message === 'Unknown action.' &&
          /LoginCode|signupParent/.test(action)
        )
          throw new Error(
            'The email-login backend is not deployed yet. Update Apps Script to version 3.0, run setupEduwave, and deploy a new version.',
          );
        throw new Error(data.message || 'Request failed');
      }
      return data.data;
    } catch (error) {
      if (error.name === 'AbortError')
        throw new Error(
          'The request timed out. It may still have completed. Refresh the portal to check before submitting again.',
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function device() {
    let id = localStorage.getItem('eduwave_device');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '';
      localStorage.setItem('eduwave_device', id);
    }
    return id;
  }

  async function encodeFile(file) {
    if (!(file instanceof File) || !file.size)
      throw new Error('Choose a file first.');
    if (file.size > MAX_UPLOAD_BYTES)
      throw new Error('Choose a file smaller than 8 MB.');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error('The selected file could not be read.'));
      reader.readAsDataURL(file);
    });
    return {
      name: file.name,
      mimeType: file.type || mimeFromName(file.name),
      size: file.size,
      data: String(dataUrl).split(',')[1] || '',
    };
  }
  return { api, device, encodeFile };
};
