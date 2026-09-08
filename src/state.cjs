module.exports = function createState() {
  const state = {
    sessionId: '',
    parent: null,
    dashboard: null,
    activeChild: '',
    admin: null,
    familyQuery: '',
    familyParentStatus: 'all',
    familyStudentStatus: 'all',
    materialQuery: '',
    submissionStudent: '',
    submissionMonth: '',
    submissionPage: 0,
    auth: { parentEmail: '', adminEmail: '' },
  };
  return state;
};
