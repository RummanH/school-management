import { apiRequest } from './client.js';

// Classes
export const listClasses       = ()           => apiRequest('/academic/classes');
export const listClassesPublic = ()           => apiRequest('/academic/classes/public');
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
export const deleteSyllabusEntry  = (entryId, classId)  => apiRequest(`/academic/syllabus/${entryId}`, { method: 'DELETE', body: { classId } });

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
export const getAttendance    = (classId, date) => apiRequest(`/academic/classes/${classId}/attendance?date=${date}`);
export const saveAttendance   = (classId, date, records) => apiRequest(`/academic/classes/${classId}/attendance`, { method: 'POST', body: { date, records } });
export const getMyAttendance  = (classId)       => apiRequest(`/academic/me/attendance?classId=${classId}`);
