import { apiRequest, buildQueryString } from './client.js';

// Classes
export const listClasses       = ()           => apiRequest('/academic/classes');
export const listClassesPublic = (schoolSlug) => apiRequest(`/academic/classes/public${buildQueryString({ school: schoolSlug })}`);
export const createClass       = (data)       => apiRequest('/academic/classes', { method: 'POST', body: data });
export const updateClass       = (id, data)   => apiRequest(`/academic/classes/${id}`, { method: 'PUT', body: data });
export const deleteClass       = (id)         => apiRequest(`/academic/classes/${id}`, { method: 'DELETE' });

// Teachers list (for pickers)
export const listTeachersForAcademic = () => apiRequest('/academic/teachers');

// Routine
export const getRoutine        = (classId)        => apiRequest(`/academic/classes/${classId}/routine`);
export const saveRoutineEntry  = (classId, data)  => apiRequest(`/academic/classes/${classId}/routine`, { method: 'POST', body: data });
export const deleteRoutineEntry = (entryId)       => apiRequest(`/academic/routine/${entryId}`, { method: 'DELETE' });

// Syllabus
export const getSyllabus          = (classId)           => apiRequest(`/academic/classes/${classId}/syllabus`);
export const createSyllabusEntry  = (classId, data)     => apiRequest(`/academic/classes/${classId}/syllabus`, { method: 'POST', body: data });
export const updateSyllabusEntry  = (entryId, data)     => apiRequest(`/academic/syllabus/${entryId}`, { method: 'PUT', body: data });
export const deleteSyllabusEntry  = (entryId)           => apiRequest(`/academic/syllabus/${entryId}`, { method: 'DELETE' });

// Exams
export const getExams       = (classId)         => apiRequest(`/academic/classes/${classId}/exams`);
export const createExam     = (classId, data)   => apiRequest(`/academic/classes/${classId}/exams`, { method: 'POST', body: data });
export const updateExam     = (examId, data)    => apiRequest(`/academic/exams/${examId}`, { method: 'PUT', body: data });
export const deleteExam     = (examId)          => apiRequest(`/academic/exams/${examId}`, { method: 'DELETE' });

// Results
export const getResults       = (examId)        => apiRequest(`/academic/exams/${examId}/results`);
export const saveResults      = (examId, entries) => apiRequest(`/academic/exams/${examId}/results`, { method: 'POST', body: { entries } });
export const getMyResults     = ()              => apiRequest('/academic/me/results');

// Attendance
export const getAttendance = (classId, date, periodNumber = 0) => apiRequest(`/academic/classes/${classId}/attendance?date=${date}&periodNumber=${periodNumber}`);
export const saveAttendance = (classId, date, periodNumber, records) => apiRequest(`/academic/classes/${classId}/attendance`, { method: 'POST', body: { date, periodNumber, records } });
export const importAttendance = (classId, data) => apiRequest(`/academic/classes/${classId}/attendance/import`, { method: 'POST', body: data });
export const getMonthlyAttendanceReport = (classId, month) => apiRequest(`/academic/classes/${classId}/attendance/monthly?month=${month}`);
export const getAttendanceCorrections = (status = 'pending') => apiRequest(`/academic/attendance/corrections?status=${status}`);
export const requestAttendanceCorrection = (data) => apiRequest('/academic/attendance/corrections', { method: 'POST', body: data });
export const reviewAttendanceCorrection = (id, data) => apiRequest(`/academic/attendance/corrections/${id}/review`, { method: 'POST', body: data });
export const getMyAttendance = (classId) => apiRequest(`/academic/me/attendance?classId=${classId}`);


// Academic structure
export const getAcademicStructure = () => apiRequest('/academic/structure');
export const createAcademicStructureRecord = (type, data) => apiRequest(`/academic/structure/${type}`, { method: 'POST', body: data });
export const updateAcademicStructureRecord = (type, id, data) => apiRequest(`/academic/structure/${type}/${id}`, { method: 'PUT', body: data });
export const deleteAcademicStructureRecord = (type, id) => apiRequest(`/academic/structure/${type}/${id}`, { method: 'DELETE' });

// Exam groups (first-class exams: name + term + session)
export const listExamGroups   = (sessionId) => apiRequest(`/academic/exam-groups${sessionId ? `?sessionId=${sessionId}` : ''}`);
export const createExamGroup  = (data)      => apiRequest('/academic/exam-groups', { method: 'POST', body: data });
export const updateExamGroup  = (id, data)  => apiRequest(`/academic/exam-groups/${id}`, { method: 'PUT', body: data });
export const deleteExamGroup  = (id)        => apiRequest(`/academic/exam-groups/${id}`, { method: 'DELETE' });

// Year-end bulk promotion
export const bulkPromoteClass = (data) => apiRequest('/academic/promote', { method: 'POST', body: data });
