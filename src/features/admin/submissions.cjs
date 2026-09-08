// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createSubmissions({
  $,
  $$,
  state,
  EduwaveUI,
  clean,
  date,
  submissionMonthKey,
  adminPanel,
}) {
  function submissionReviewCard(x, d) {
    const student = d.students.find((s) => s.student_id === x.student_id),
      resource = d.resources.find((r) => r.resource_id === x.resource_id);
    return `<form class="submission-review-form"><input type="hidden" name="submissionId" value="${clean(x.submission_id)}"><div class="submission-review-head"><div><b>${clean(student?.name || 'Former student')}</b><small>${clean(resource?.title || 'Assignment')} &#8250; sent ${clean(date(x.submitted_at))}</small></div><span class="status-pill ${clean(x.status)}">${clean(x.status.replace('_', ' '))}</span></div>${x.has_attachment ? `<div class="submission-attachment"><div><b>${clean(x.attachment_name || 'Uploaded work')}</b><small>${Math.max(1, Math.ceil((x.attachment_size || 0) / 1024))} KB &#8250; protected academy copy</small></div><button class="button button-outline" type="button" data-submission-file="${clean(x.submission_id)}">Preview uploaded work</button></div>` : ''}<div class="answer-preview">${x.answers.map((a) => `<p><b>${clean(a.question || `Row ${a.row}`)}</b><span>${clean(a.answer)}</span></p>`).join('') || (x.has_attachment ? '<p>Answers are in the uploaded scan.</p>' : '<p>No typed answers; see learner note.</p>')}${x.student_note ? `<p><b>Learner note</b><span>${clean(x.student_note)}</span></p>` : ''}</div><div class="submission-review-fields"><label>Review outcome<select name="status"><option value="reviewed" ${x.status === 'reviewed' ? 'selected' : ''}>Reviewed</option><option value="needs_changes" ${x.status === 'needs_changes' ? 'selected' : ''}>Needs changes</option></select></label><label>Feedback<textarea name="feedback" rows="2" placeholder="Optional feedback for the learner">${clean(x.feedback || '')}</textarea></label></div><button class="button button-dark">Save review</button><p class="form-status"></p></form>`;
  }

  function submissionsPanel(d) {
    const all = d.submissions || [],
      filtered = all.filter(
        (x) =>
          (!state.submissionStudent ||
            x.student_id === state.submissionStudent) &&
          (!state.submissionMonth ||
            submissionMonthKey(x.submitted_at) === state.submissionMonth),
      ),
      pages = Math.max(1, Math.ceil(filtered.length / 10));
    state.submissionPage = Math.min(
      Math.max(0, state.submissionPage),
      pages - 1,
    );
    const start = state.submissionPage * 10,
      items = filtered.slice(start, start + 10),
      studentOptions = d.students
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map(
          (s) =>
            `<option value="${clean(s.student_id)}" ${s.student_id === state.submissionStudent ? 'selected' : ''}>${clean(s.name)}${s.enrollment_status === 'active' ? '' : ' (former)'}</option>`,
        )
        .join('');
    return `<section class="admin-panel submissions-panel"><div class="submissions-heading"><div><p class="eyebrow">Submission archive</p><h3>Student work, without the clutter.</h3><p>Filter by child or month. Completed work stays here even after access is revoked or a student leaves.</p></div><span class="submission-total"><b>${filtered.length}</b> matching</span></div><div class="submission-filters"><label>Student<select id="submission-student-filter"><option value="">All students</option>${studentOptions}</select></label><label>Submission month<input id="submission-month-filter" type="month" value="${clean(state.submissionMonth)}"></label><button class="button button-outline" id="submission-filter-clear" type="button">Clear filters</button></div><div class="submission-review-list">${items.map((x) => submissionReviewCard(x, d)).join('') || EduwaveUI.stateMarkup({ title: 'No submissions found', description: 'Try another student or month, or clear the filters above.' })}</div><nav class="submission-pagination" aria-label="Submission pages"><span>${filtered.length ? `Showing ${start + 1}-${Math.min(start + 10, filtered.length)} of ${filtered.length}` : 'Showing 0 submissions'}</span><div><button type="button" data-submission-page="${state.submissionPage - 1}" ${state.submissionPage === 0 ? 'disabled' : ''}>&larr; Previous</button><b>Page ${state.submissionPage + 1} of ${pages}</b><button type="button" data-submission-page="${state.submissionPage + 1}" ${state.submissionPage >= pages - 1 ? 'disabled' : ''}>Next &rarr;</button></div></nav></section>`;
  }

  function bindSubmissionDirectory() {
    $('#submission-student-filter')?.addEventListener('change', (event) => {
      state.submissionStudent = event.currentTarget.value;
      state.submissionPage = 0;
      adminPanel('submissions');
    });
    $('#submission-month-filter')?.addEventListener('change', (event) => {
      state.submissionMonth = event.currentTarget.value;
      state.submissionPage = 0;
      adminPanel('submissions');
    });
    $('#submission-filter-clear')?.addEventListener('click', () => {
      state.submissionStudent = '';
      state.submissionMonth = '';
      state.submissionPage = 0;
      adminPanel('submissions');
    });
    $$('[data-submission-page]').forEach((button) =>
      button.addEventListener('click', () => {
        if (button.disabled) return;
        state.submissionPage = Number(button.dataset.submissionPage) || 0;
        adminPanel('submissions');
      }),
    );
  }
  return { submissionReviewCard, submissionsPanel, bindSubmissionDirectory };
};
