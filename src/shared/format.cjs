// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createFormatting({}) {
  function clean(s) {
    return String(s || '').replace(
      /[&<>'"]/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[c],
    );
  }

  function date(v) {
    if (!v) return 'Not set';
    const d = new Date(v);
    return isNaN(d)
      ? v
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  }

  function maskEmail(value) {
    const parts = String(value || '').split('@');
    if (parts.length !== 2) return 'approved inbox';
    const name = parts[0],
      domain = parts[1].split('.'),
      maskedName = name.slice(0, 1) + '***',
      maskedDomain =
        (domain[0]?.slice(0, 1) || '') +
        '***' +
        (domain.length > 1 ? '.' + domain.slice(1).join('.') : '');
    return maskedName + '@' + maskedDomain;
  }

  function mimeFromName(name) {
    const ext = String(name || '')
        .toLowerCase()
        .split('.')
        .pop(),
      types = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        rtf: 'application/rtf',
        txt: 'text/plain',
      };
    return types[ext] || '';
  }

  function options(items, value, label) {
    return `<option value="">Select</option>${items.map((x) => `<option value="${clean(x[value])}">${clean(x[label])}</option>`).join('')}`;
  }

  function submissionMonthKey(value) {
    const raw = String(value || ''),
      match = raw.match(/^\d{4}-\d{2}/);
    if (match) return match[0];
    const parsed = new Date(raw);
    return isNaN(parsed)
      ? ''
      : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  function activeStudents(d) {
    return d.students.filter((x) => x.enrollment_status === 'active');
  }
  return {
    clean,
    date,
    maskEmail,
    mimeFromName,
    options,
    submissionMonthKey,
    activeStudents,
  };
};
