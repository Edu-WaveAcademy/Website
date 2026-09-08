// Monthly fees, payment references and manual reminder workflow.

function generateMonthlyFees() {
  var r = generateMonthlyFees_();
  SpreadsheetApp.getUi().alert(
    'Created ' + r.created + ' fee row(s) for ' + r.month + '.'
  );
}

function generateMonthlyFees_() {
  var month = Utilities.formatDate(new Date(), TZ, 'MMMM yyyy'),
    created = 0;
  rows_(PORTAL.students)
    .filter(function (r) {
      return (
        clean_(r.enrollment_status).toLowerCase() === 'active' &&
        Number(r.monthly_fee) > 0
      );
    })
    .forEach(function (s) {
      if (
        first_(PORTAL.fees, function (f) {
          return f.student_id === s.student_id && f.billing_month === month;
        })
      )
        return;
      var due = new Date();
      due.setDate(Math.max(1, Math.min(28, Number(s.due_day) || 10)));
      append_(PORTAL.fees, {
        fee_id: id_('FEE'),
        student_id: s.student_id,
        billing_month: month,
        amount: s.monthly_fee,
        due_date: date_(due),
        status: 'due',
        paid_date: '',
        reference: '',
        parent_note: '',
        updated_at: stamp_()
      });
      created += 1;
    });
  audit_(
    'system',
    'monthly-batch',
    'fees_generated',
    'fee',
    month,
    String(created)
  );
  return { created: created, month: month };
}

function parentPaymentNote_(p) {
  var parent = parentFromSession_(p.sessionId),
    sid = clean_(p.studentId);
  requireLinkedStudent_(parent.parent_id, sid);
  var fee = first_(PORTAL.fees, function (r) {
    return r.fee_id === clean_(p.feeId) && r.student_id === sid;
  });
  if (!fee) throw new Error('Fee record not found.');
  if (!clean_(p.reference))
    throw new Error('Add the UPI reference before submitting.');
  update_(PORTAL.fees, fee._row, {
    status: 'pending_verification',
    reference: clean_(p.reference),
    parent_note: clean_(p.note),
    updated_at: stamp_()
  });
  audit_(
    'parent',
    parent.parent_id,
    'payment_note_submitted',
    'fee',
    fee.fee_id,
    clean_(p.reference)
  );
  return { submitted: true };
}

function adminMarkFeePaid_(p) {
  var admin = requireAdmin_(p.sessionId),
    fee = first_(PORTAL.fees, function (r) {
      return r.fee_id === clean_(p.feeId);
    });
  if (!fee) throw new Error('Fee record not found.');
  update_(PORTAL.fees, fee._row, {
    status: 'paid',
    paid_date: clean_(p.paidDate) || date_(),
    reference: clean_(p.reference) || fee.reference,
    updated_at: stamp_()
  });
  audit_(
    'admin',
    admin.email,
    'fee_marked_paid',
    'fee',
    fee.fee_id,
    fee.student_id
  );
  return { paid: true };
}

function adminQueueReminder_(p) {
  var admin = requireAdmin_(p.sessionId),
    student = first_(PORTAL.students, function (r) {
      return r.student_id === clean_(p.studentId);
    });
  if (!student) throw new Error('Child not found.');
  var link = first_(PORTAL.links, function (r) {
      return (
        r.student_id === student.student_id &&
        clean_(r.active).toLowerCase() === 'true'
      );
    }),
    parent =
      link &&
      first_(PORTAL.parents, function (r) {
        return r.parent_id === link.parent_id;
      });
  if (!parent || !clean_(parent.phone))
    throw new Error('An active parent phone number is required for WhatsApp.');
  var message =
      clean_(p.message) ||
      'Hello ' +
        parent.name +
        ', this is an Eduwave Academy update for ' +
        student.name +
        '.',
    phone = clean_(parent.phone).replace(/[^0-9]/g, '');
  if (phone.length === 10) phone = '91' + phone;
  var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  append_(PORTAL.reminders, {
    reminder_id: id_('REM'),
    student_id: student.student_id,
    type: clean_(p.type) || 'general',
    message: message,
    created_at: stamp_(),
    sent_at: '',
    status: 'queued',
    whatsapp_url: url
  });
  audit_(
    'admin',
    admin.email,
    'reminder_queued',
    'student',
    student.student_id,
    clean_(p.type) || 'general'
  );
  return { whatsappUrl: url };
}
