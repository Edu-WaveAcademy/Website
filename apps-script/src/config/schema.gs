// Code.gs is generated: edit apps-script/src and concatenate modules.json in order.
// Workbook schema and runtime policy. Initializers must remain first.

/* Eduwave trial portal. Bind to the academy spreadsheet; run setupEduwave() once. */
const PORTAL = {
  parents: 'Portal_Parents',
  students: 'Portal_Students',
  links: 'Portal_ParentStudents',
  sessions: 'Portal_Sessions',
  loginCodes: 'Portal_LoginCodes',
  trials: 'Portal_Trials',
  fees: 'Portal_Fees',
  driveIndex: 'Portal_DriveIndex',
  resources: 'Portal_Resources',
  assignments: 'Portal_Assignments',
  worksheetRows: 'Portal_WorksheetRows',
  submissions: 'Portal_Submissions',
  attendance: 'Portal_Attendance',
  progress: 'Portal_Progress',
  announcements: 'Portal_Announcements',
  reminders: 'Portal_Reminders',
  audit: 'Portal_AuditLogs',
  config: 'Portal_Config'
};
const HEADERS = {};
HEADERS[PORTAL.parents] = [
  'parent_id',
  'name',
  'email',
  'phone',
  'status',
  'created_at',
  'updated_at',
  'email_verified_at'
];
HEADERS[PORTAL.students] = [
  'student_id',
  'name',
  'class_level',
  'enrollment_status',
  'monthly_fee',
  'due_day',
  'created_at',
  'updated_at'
];
HEADERS[PORTAL.links] = [
  'link_id',
  'parent_id',
  'student_id',
  'relationship',
  'active',
  'created_at'
];
HEADERS[PORTAL.sessions] = [
  'session_id',
  'parent_id',
  'device_hash',
  'label',
  'created_at',
  'last_seen_at',
  'expires_at',
  'revoked_at',
  'revoke_reason',
  'role',
  'email'
];
HEADERS[PORTAL.loginCodes] = [
  'code_id',
  'email',
  'role',
  'code_hmac',
  'device_hash',
  'created_at',
  'expires_at',
  'attempts',
  'used_at'
];
HEADERS[PORTAL.trials] = [
  'trial_id',
  'child_name',
  'class_level',
  'parent_name',
  'phone',
  'email',
  'subjects',
  'preferred_slot',
  'notes',
  'status',
  'created_at',
  'updated_at'
];
HEADERS[PORTAL.fees] = [
  'fee_id',
  'student_id',
  'billing_month',
  'amount',
  'due_date',
  'status',
  'paid_date',
  'reference',
  'parent_note',
  'updated_at'
];
HEADERS[PORTAL.driveIndex] = [
  'drive_id',
  'parent_drive_id',
  'path',
  'name',
  'mime_type',
  'kind',
  'owner_email',
  'ownership',
  'size_bytes',
  'modified_at',
  'indexed_at',
  'safe_candidate',
  'skip_reason',
  'resource_id',
  'last_seen_at',
  'sync_run_id'
];
HEADERS[PORTAL.resources] = [
  'resource_id',
  'drive_id',
  'title',
  'subject',
  'class_level',
  'kind',
  'status',
  'created_at',
  'updated_at',
  'submission_type',
  'library_path',
  'source',
  'auto_added'
];
HEADERS[PORTAL.assignments] = [
  'assignment_id',
  'student_id',
  'resource_id',
  'title_override',
  'visible_from',
  'due_date',
  'status',
  'created_at'
];
HEADERS[PORTAL.worksheetRows] = ['resource_id', 'row_no', 'question', 'hint'];
HEADERS[PORTAL.submissions] = [
  'submission_id',
  'assignment_id',
  'student_id',
  'resource_id',
  'responses_json',
  'student_note',
  'status',
  'submitted_at',
  'updated_at',
  'reviewed_at',
  'feedback',
  'attachment_drive_id',
  'attachment_name',
  'attachment_mime',
  'attachment_size'
];
HEADERS[PORTAL.attendance] = [
  'attendance_id',
  'student_id',
  'session_date',
  'subject',
  'status',
  'note',
  'updated_at'
];
HEADERS[PORTAL.progress] = [
  'progress_id',
  'student_id',
  'subject',
  'topic',
  'score',
  'teacher_note',
  'updated_at'
];
HEADERS[PORTAL.announcements] = [
  'announcement_id',
  'audience',
  'student_id',
  'title',
  'message',
  'type',
  'active_from',
  'active_until',
  'created_at'
];
HEADERS[PORTAL.reminders] = [
  'reminder_id',
  'student_id',
  'type',
  'message',
  'created_at',
  'sent_at',
  'status',
  'whatsapp_url'
];
HEADERS[PORTAL.audit] = [
  'event_id',
  'actor_type',
  'actor_id',
  'event',
  'entity_type',
  'entity_id',
  'detail',
  'created_at'
];
HEADERS[PORTAL.config] = ['key', 'value', 'updated_at'];
const SESSION_IDLE_MINUTES = 60,
  ADMIN_IDLE_MINUTES = 30,
  SESSION_ABSOLUTE_HOURS = 12,
  ADMIN_ABSOLUTE_HOURS = 8,
  MAX_ACTIVE_SESSIONS = 1,
  OTP_EXPIRY_MINUTES = 10,
  OTP_REQUEST_LIMIT = 3,
  OTP_WINDOW_MINUTES = 15,
  OTP_MAX_ATTEMPTS = 5,
  MAX_UPLOAD_BYTES = 8 * 1024 * 1024,
  MAX_BINARY_BYTES = 10 * 1024 * 1024,
  TZ = Session.getScriptTimeZone() || 'Asia/Kolkata';
const STUDENT_UPLOAD_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACADEMY_UPLOAD_MIMES = STUDENT_UPLOAD_MIMES.concat([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  'text/rtf',
  'text/plain'
]);
