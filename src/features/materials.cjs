// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createMaterials({
  $,
  $$,
  state,
  EduwaveUI,
  FormData,
  clean,
  date,
  api,
  encodeFile,
  setStatus,
  setBusy,
  notify,
  openDialog,
  refreshParent,
}) {
  function worksheetTable(view) {
    const answerMode = view.submissionType === 'online_answers',
      saved = new Map(
        (view.submission?.answers || []).map((x) => [Number(x.row), x.answer]),
      ),
      rows = view.values || [],
      head = rows[0] || [];
    return `<div class="worksheet-table-wrap"><table class="viewer-table worksheet-table"><thead><tr>${head.map((c) => `<th>${clean(c)}</th>`).join('')}${answerMode ? '<th>Your answer</th>' : ''}</tr></thead><tbody>${rows
      .slice(1)
      .map((r, index) => {
        const row = index + 2,
          question = r.filter(Boolean).join(' | ') || `Question ${index + 1}`;
        return `<tr>${r.map((c) => `<td>${clean(c)}</td>`).join('')}${answerMode ? `<td><input class="worksheet-answer" data-row="${row}" data-question="${clean(question)}" value="${clean(saved.get(row) || '')}" aria-label="Answer for row ${row}" placeholder="Type your answer"></td>` : ''}</tr>`;
      })
      .join('')}</tbody></table></div>`;
  }

  function submissionPanel(view) {
    if (view.submissionType === 'view_only')
      return '<div class="notice assignment-note">This is reference material. Nothing needs to be submitted.</div>';
    const sub = view.submission,
      status = sub?.status || 'pending',
      locked = status === 'reviewed',
      fileMode = view.submissionType === 'file_upload',
      statusText =
        status === 'pending' ? 'Not submitted' : status.replace('_', ' '),
      feedback = sub?.feedback
        ? `<div class="teacher-feedback"><b>Teacher feedback</b><p>${clean(sub.feedback)}</p></div>`
        : '';
    const upload = fileMode
      ? `<label class="upload-field"><span class="upload-icon" aria-hidden="true">&#8593;</span><span><b>${sub?.has_attachment ? 'Replace submitted scan' : 'Add completed work'}</b><small>PDF, JPG, or PNG, up to 8 MB. Use your phone camera or a scanner.</small>${sub?.has_attachment ? `<em>Current file: ${clean(sub.attachment_name)}</em>` : ''}</span><input name="attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" ${sub?.has_attachment ? '' : 'required'} ${locked ? 'disabled' : ''}></label>`
      : '';
    const guidance = fileMode
      ? 'Answer in a notebook, scan every completed page clearly, then upload one PDF or image.'
      : 'Type answers directly in the worksheet below. Your work is stored in Eduwave, not in the academy master Sheet.';
    return `<section class="submission-card"><div class="submission-heading"><div><p class="eyebrow">Send to teacher</p><h3>${fileMode ? 'Upload completed work' : 'Complete and submit'}</h3></div><span class="status-pill ${clean(status)}">${clean(statusText)}</span></div><p>${guidance}${view.dueDate ? ` Due ${clean(date(view.dueDate))}.` : ''}</p>${feedback}<form id="assignment-submit-form">${upload}<label class="field"><span>Message for the teacher <small>optional</small></span><textarea name="note" rows="3" placeholder="Mention any question you found difficult" ${locked ? 'disabled' : ''}>${clean(sub?.student_note || '')}</textarea></label><button class="button button-ink" type="submit" ${locked ? 'disabled' : ''}>${locked ? 'Reviewed by teacher' : sub ? (fileMode ? 'Update submitted work' : 'Resend updated work') : fileMode ? 'Send completed work' : 'Submit worksheet'}</button><p class="form-status" role="status" aria-live="polite">${sub ? `Last sent ${clean(date(sub.submitted_at))}.` : ''}</p></form></section>`;
  }

  async function submitAssignment(event, view, studentId) {
    event.preventDefault();
    const form = event.currentTarget,
      out = $('.form-status', form),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      ),
      answers = $$('.worksheet-answer', $('#viewer-content'))
        .map((input) => ({
          row: Number(input.dataset.row),
          question: input.dataset.question,
          answer: input.value.trim(),
        }))
        .filter((x) => x.answer);
    setStatus(out, 'Sending your work...');
    setBusy(button, true, 'Sending...');
    try {
      const file = $('[name="attachment"]', form)?.files?.[0],
        attachment = file ? await encodeFile(file) : null;
      await api('parentSubmitAssignment', {
        sessionId: state.sessionId,
        studentId,
        assignmentId: view.assignmentId,
        answers,
        note: new FormData(form).get('note'),
        attachment,
      });
      setBusy(button, false);
      button.textContent = 'Submitted';
      setStatus(out, 'Submitted. Your teacher can now review it.', 'success');
      notify('Work submitted to the academy.');
      $$('input, textarea, button', form.closest('.submission-card')).forEach(
        (x) => (x.disabled = true),
      );
      $$('.worksheet-answer', $('#viewer-content')).forEach(
        (x) => (x.disabled = true),
      );
      await refreshParent();
    } catch (err) {
      setStatus(out, err.message, 'error');
      notify(err.message, 'error');
      setBusy(button, false);
    }
  }

  function secureFileBody(view) {
    if (view.kind === 'text')
      return `<div class="viewer-text">${clean(view.text)}</div>`;
    if (view.kind === 'image')
      return `<img class="viewer-image" alt="${clean(view.title)}" src="${view.data_url}">`;
    if (view.kind === 'pdf')
      return `<iframe class="viewer-pdf" title="${clean(view.title)}" src="${view.data_url}"></iframe>`;
    if (view.kind === 'download')
      return `<div class="download-card"><p>${clean(view.message || 'Download this file to open it in a compatible app.')}</p><a class="button button-ink" href="${view.data_url}" download="${clean(view.file_name || view.title)}">Download ${clean(view.file_name || 'file')}</a></div>`;
    return `<div class="notice">${clean(view.message)}</div>`;
  }

  async function resource(resourceId, trigger) {
    const studentId = state.activeChild;
    $('#viewer-content').innerHTML =
      '<div class="viewer-frame"><div class="notice">Loading secure preview...</div></div>';
    openDialog('viewer-dialog', trigger);
    try {
      const view = await api('parentResource', {
          sessionId: state.sessionId,
          studentId,
          resourceId,
        }),
        body =
          view.kind === 'table' ? worksheetTable(view) : secureFileBody(view);
      $('#viewer-content').innerHTML =
        `<div class="viewer-frame"><span class="watermark">${clean(view.watermark || 'Eduwave secure preview')}</span><div class="viewer-title-row"><div><p class="eyebrow">${clean(view.kind === 'table' ? 'Worksheet' : 'Assigned material')}</p><h2 id="viewer-heading">${clean(view.title)}</h2></div>${view.dueDate ? `<span class="status-pill">Due ${clean(date(view.dueDate))}</span>` : ''}</div><div id="worksheet-shell">${body}</div>${submissionPanel(view)}</div>`;
      $('#assignment-submit-form')?.addEventListener('submit', (e) =>
        submitAssignment(e, view, studentId),
      );
      api('parentEvent', {
        sessionId: state.sessionId,
        event: 'resource_viewed',
        entityType: 'resource',
        entityId: resourceId,
        detail: 'viewer_open',
      }).catch(() => {});
    } catch (err) {
      $('#viewer-content').innerHTML =
        `<div class="viewer-frame"><div class="notice">${clean(err.message)}</div></div>`;
      notify(err.message, 'error');
    }
  }

  async function submissionFile(submissionId, trigger) {
    $('#viewer-content').innerHTML =
      '<div class="viewer-frame">' +
      EduwaveUI.stateMarkup({
        kind: 'loading',
        title: 'Loading protected submission…',
      }) +
      '</div>';
    openDialog('viewer-dialog', trigger);
    try {
      const view = await api('adminSubmissionFile', {
        sessionId: state.admin.sessionId,
        submissionId,
      });
      $('#viewer-content').innerHTML =
        `<div class="viewer-frame"><span class="watermark">Academy review copy</span><div class="viewer-title-row"><div><p class="eyebrow">Student submission</p><h2 id="viewer-heading">${clean(view.title)}</h2></div></div>${secureFileBody({ ...view, file_name: view.title, message: 'Download this submitted file to review it.' })}</div>`;
    } catch (err) {
      $('#viewer-content').innerHTML =
        `<div class="viewer-frame"><div class="notice">${clean(err.message)}</div></div>`;
      notify(err.message, 'error');
    }
  }
  return {
    worksheetTable,
    submissionPanel,
    submitAssignment,
    secureFileBody,
    resource,
    submissionFile,
  };
};
