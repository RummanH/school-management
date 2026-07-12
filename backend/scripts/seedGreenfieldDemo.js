// One-time demo data seeder for Greenfield Academy.
// Wipes all existing data (every tenant) and inserts one complete, realistic
// dataset for a single school so a live sales demo has something coherent to
// click through. Run with: node backend/scripts/seedGreenfieldDemo.js
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { createSchema } from "../db/schema.js";
import { backendRoot, publicUploadsPath, projectRoot } from "../config/paths.js";

const { Client } = pg;

// ---------------------------------------------------------------------------
// Small deterministic PRNG so re-running the script produces the same demo
// data (helpful if it needs to be re-run right before the demo).
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260712);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const MINUS = "−";

function pad(n, len = 2) { return String(n).padStart(len, "0"); }
function isoDate(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

// ---------------------------------------------------------------------------
// DB connection — the pooled connection string in .env caps at 1 connection,
// so a single sequential Client (not a Pool) is used throughout.
// ---------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set (backend/.env).");
const client = new Client({
  connectionString,
  ssl: connectionString.includes("sslmode=no-verify") ? { rejectUnauthorized: false } : undefined,
});

async function insertMany(table, columns, rows, chunkSize = 100) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const tuples = chunk.map((row, ri) => {
      const placeholders = columns.map((_, ci) => `$${ri * columns.length + ci + 1}`);
      row.forEach((v) => values.push(v));
      return `(${placeholders.join(",")})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${tuples.join(",")}`, values);
  }
}

const ALL_TABLES = [
  "communication_messages", "communication_threads",
  "fee_invoice_items", "fee_payments", "fee_invoices", "fee_assignments", "fee_structures", "fee_categories",
  "finance_transactions", "expenses", "donations",
  "staff_performance_notes", "staff_documents", "staff_payroll_records", "staff_leave_requests", "staff_attendance", "staff_profiles",
  "admission_documents", "admission_applications",
  "guardian_students", "gallery_items", "notices",
  "attendance_correction_requests", "attendance_records",
  "exam_results", "exam_schedules", "exams",
  "syllabus_entries", "class_routines", "student_academic_movements",
  "grading_policies", "teacher_subject_assignments",
  "student_profiles", "teacher_profiles",
  "classes", "subjects", "academic_terms", "academic_sessions",
  "contact_messages", "account_lockouts", "login_attempts", "password_reset_tokens", "audit_logs", "user_sessions",
  "users", "tenants",
];

async function wipeAllData() {
  await client.query(`TRUNCATE TABLE ${ALL_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------
const CLASSES = [
  { name: "Class Six", section: "A", tuition: 1200, ageBase: 11 },
  { name: "Class Seven", section: "A", tuition: 1300, ageBase: 12 },
  { name: "Class Eight", section: "A", tuition: 1400, ageBase: 13 },
  { name: "Class Nine", section: "A", tuition: 1500, ageBase: 14 },
  { name: "Class Nine", section: "B", tuition: 1500, ageBase: 14 },
  { name: "Class Ten", section: "A", tuition: 1600, ageBase: 15 },
];

const SUBJECTS = [
  { code: "BAN101", name: "Bangla", department: "Languages" },
  { code: "ENG101", name: "English", department: "Languages" },
  { code: "MAT101", name: "Mathematics", department: "Mathematics" },
  { code: "SCI101", name: "General Science", department: "Science" },
  { code: "SST101", name: "Bangladesh & Global Studies", department: "Social Science" },
  { code: "ICT101", name: "Information & Communication Technology", department: "ICT" },
  { code: "REL101", name: "Religious Studies", department: "Religion" },
  { code: "PHE101", name: "Physical Education", department: "Co-curricular" },
];
const CORE_SUBJECTS = ["Bangla", "English", "Mathematics", "General Science", "Bangladesh & Global Studies"];

const TEACHERS = [
  { name: "Dr. Mahbub Islam", subject: "General Science", designation: "Head Teacher", department: "Science", qualification: "M.Sc, B.Ed", dob: "1978-04-12", gender: "Male", salary: 45000, classTeacherOf: "Class Ten-A" },
  { name: "Nusrat Jahan", subject: "Mathematics", designation: "Senior Teacher", department: "Mathematics", qualification: "M.Sc, M.Ed", dob: "1985-09-03", gender: "Female", salary: 38000, classTeacherOf: "Class Nine-A" },
  { name: "Rashed Karim", subject: "English", designation: "Assistant Teacher", department: "Languages", qualification: "M.A, B.Ed", dob: "1988-01-20", gender: "Male", salary: 32000, classTeacherOf: "Class Eight-A" },
  { name: "Sabina Akter", subject: "Information & Communication Technology", designation: "ICT Teacher", department: "ICT", qualification: "B.Sc in CSE", dob: "1990-11-15", gender: "Female", salary: 33000, classTeacherOf: "Class Nine-B" },
  { name: "Kamrul Hasan", subject: "Bangla", designation: "Assistant Teacher", department: "Languages", qualification: "M.A", dob: "1982-06-25", gender: "Male", salary: 30000, classTeacherOf: "Class Seven-A" },
  { name: "Farhana Yasmin", subject: "Bangladesh & Global Studies", designation: "Assistant Teacher", department: "Social Science", qualification: "M.S.S, B.Ed", dob: "1991-03-08", gender: "Female", salary: 30000, classTeacherOf: "Class Six-A" },
  { name: "Imran Hossain", subject: "Religious Studies", designation: "Assistant Teacher", department: "Religion", qualification: "Kamil, B.Ed", dob: "1980-07-17", gender: "Male", salary: 28000, classTeacherOf: null },
  { name: "Shirin Sultana", subject: "Physical Education", designation: "Physical Education Teacher", department: "Co-curricular", qualification: "B.P.Ed", dob: "1993-02-28", gender: "Female", salary: 26000, classTeacherOf: null },
];

const STUDENT_MALE = ["Arif", "Tanvir", "Shakil", "Nayeem", "Fahim", "Rakib", "Sabbir", "Rayhan", "Imtiaz", "Mahin", "Zubayer", "Ashraf", "Riyad", "Nabil", "Rafiqul"];
const STUDENT_FEMALE = ["Nusrat", "Sadia", "Tania", "Farzana", "Mim", "Priya", "Anika", "Sumaiya", "Jannat", "Ruma", "Tasnim", "Ishrat", "Labonno", "Mehjabin", "Afsana"];
const SURNAMES = ["Islam", "Rahman", "Hossain", "Ahmed", "Khan", "Chowdhury", "Sarker", "Uddin", "Karim", "Hasan", "Alam", "Miah", "Talukder", "Bhuiyan", "Molla"];
const ADULT_MALE = ["Rafiqul", "Kamal", "Jamal", "Aminul", "Habibur", "Delwar", "Mizanur", "Golam", "Shahidul", "Nazrul", "Anwar", "Sirajul", "Moksedul", "Badrul", "Ekramul"];
const ADULT_FEMALE = ["Rashida", "Salma", "Nasrin", "Rehana", "Shirin", "Momtaz", "Rokeya", "Hosne Ara", "Parvin", "Rina", "Sultana", "Josna", "Ferdousi", "Halima", "Shahnaz"];
const AREAS = ["Mirpur", "Dhanmondi", "Mohammadpur", "Uttara", "Bashundhara R/A", "Banani", "Rampura", "Badda", "Khilgaon", "Shyamoli", "Malibagh", "Jatrabari", "Lalmatia", "Kafrul", "Mohakhali"];
const BLOOD_GROUPS = ["A+", `A${MINUS}`, "B+", `B${MINUS}`, "O+", `O${MINUS}`, "AB+", `AB${MINUS}`];
const PREV_SCHOOLS = ["Sunshine Kindergarten", "Little Angels School", "City Model School", "Green Valley Primary", "Rainbow Academy"];

const GRADES = [
  { grade: "A+", min: 80, max: 100, gp: 5.0 },
  { grade: "A", min: 70, max: 79.99, gp: 4.0 },
  { grade: "A-", min: 60, max: 69.99, gp: 3.5 },
  { grade: "B", min: 50, max: 59.99, gp: 3.0 },
  { grade: "C", min: 40, max: 49.99, gp: 2.0 },
  { grade: "D", min: 33, max: 39.99, gp: 1.0 },
  { grade: "F", min: 0, max: 32.99, gp: 0.0, fail: true },
];
function gradeFor(pct) { return GRADES.find((g) => pct >= g.min && pct <= g.max) || GRADES[GRADES.length - 1]; }

const SCHOOL_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const PERIODS = [
  { n: 1, start: "08:00", end: "08:45" },
  { n: 2, start: "08:45", end: "09:30" },
  { n: 3, start: "09:30", end: "10:15" },
  { n: 4, start: "10:35", end: "11:20" },
  { n: 5, start: "11:20", end: "12:05" },
  { n: 6, start: "12:05", end: "12:50" },
];

function lastSchoolDays(count, beforeDate) {
  const out = [];
  const d = new Date(beforeDate);
  while (out.length < count) {
    d.setDate(d.getDate() - 1);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    if (dayName !== "Friday") out.push({ date: isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()), day: dayName });
  }
  return out.reverse();
}

// ---------------------------------------------------------------------------
async function main() {
  await client.connect();
  console.log("Connected. Wiping existing data...");
  await wipeAllData();
  console.log("Database clean. Seeding Greenfield Academy demo data...");

  const now = new Date();
  const TODAY = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()); // 2026-07-12

  // --- Password hashes (shared per role tier, computed once) --------------
  const [devHash, adminHash, accountantHash, teacherHash, studentHash, guardianHash] = await Promise.all([
    hashPassword(process.env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD || "Developer@12345"),
    hashPassword("Greenfield@2026"),
    hashPassword("Accounts@2026"),
    hashPassword("Teacher@2026"),
    hashPassword("Student@2026"),
    hashPassword("Guardian@2026"),
  ]);

  // --- System developer (platform login, tenant_id NULL) ------------------
  await insertMany("users", ["id", "tenant_id", "name", "email", "password_hash", "role", "status"], [
    [createId("user"), null, process.env.DEFAULT_SYSTEM_DEVELOPER_NAME || "System Developer", process.env.DEFAULT_SYSTEM_DEVELOPER_EMAIL || "developer@school.local", devHash, "system_developer", "active"],
  ]);

  // --- Tenant ---------------------------------------------------------------
  const tenantId = createId("tenant");
  await insertMany("tenants", ["id", "name", "slug", "email", "plan", "status", "institution_type", "address", "phone"], [
    [tenantId, "Greenfield Academy", "greenfield-academy", "info@greenfieldacademy.edu.bd", "pro", "active", "SCHOOL", "123 Academy Road, Dhaka 1200, Bangladesh", "+880 1700-000000"],
  ]);

  // --- Academic session & terms ---------------------------------------------
  const sessionId = createId("session");
  await insertMany("academic_sessions", ["id", "tenant_id", "name", "start_date", "end_date", "is_active"], [
    [sessionId, tenantId, "2026", "2026-01-01", "2026-12-31", true],
  ]);
  const terms = [
    { id: createId("term"), name: "First Term", start: "2026-01-01", end: "2026-04-30", sort: 1 },
    { id: createId("term"), name: "Half-Yearly Term", start: "2026-05-01", end: "2026-07-31", sort: 2 },
    { id: createId("term"), name: "Annual Term", start: "2026-08-01", end: "2026-12-31", sort: 3 },
  ];
  await insertMany("academic_terms", ["id", "tenant_id", "session_id", "name", "start_date", "end_date", "sort_order"],
    terms.map((t) => [t.id, tenantId, sessionId, t.name, t.start, t.end, t.sort]));

  // --- Subjects ---------------------------------------------------------------
  const subjectRows = SUBJECTS.map((s) => ({ ...s, id: createId("subject") }));
  await insertMany("subjects", ["id", "tenant_id", "code", "name", "department", "description", "is_active"],
    subjectRows.map((s) => [s.id, tenantId, s.code, s.name, s.department, `${s.name} curriculum for Greenfield Academy.`, true]));
  const subjectByName = new Map(subjectRows.map((s) => [s.name, s]));

  // --- Teachers (users + profiles) -------------------------------------------
  const teacherRecords = TEACHERS.map((t) => {
    const [first, ...rest] = t.name.replace(/^Dr\.\s*/, "").split(" ");
    const emailLocal = `${first.toLowerCase()}.${rest[rest.length - 1].toLowerCase()}`;
    return {
      ...t,
      userId: createId("user"),
      profileId: createId("teacher"),
      email: `${emailLocal}@greenfieldacademy.edu.bd`,
      employeeId: `GA-EMP-${pad(TEACHERS.indexOf(t) + 1, 3)}`,
      phone: `017${randInt(10000000, 99999999)}`,
      bloodGroup: pick(BLOOD_GROUPS),
      joining: isoDate(randInt(2015, 2023), randInt(1, 12), randInt(1, 28)),
    };
  });
  await insertMany("users", ["id", "tenant_id", "name", "email", "password_hash", "role", "status"],
    teacherRecords.map((t) => [t.userId, tenantId, t.name, t.email, teacherHash, "teacher", "active"]));

  // --- Classes (needs teacher user ids for class_teacher_id) -----------------
  const classRecords = CLASSES.map((c) => {
    const teacher = teacherRecords.find((t) => t.classTeacherOf === `${c.name}-${c.section}`);
    return { ...c, id: createId("class"), classTeacherId: teacher ? teacher.userId : null };
  });
  await insertMany("classes", ["id", "tenant_id", "name", "section", "academic_year", "class_teacher_id", "description", "session_id"],
    classRecords.map((c) => [c.id, tenantId, c.name, c.section, "2026", c.classTeacherId, `${c.name} - Section ${c.section}, academic session 2026.`, sessionId]));
  const classByKey = new Map(classRecords.map((c) => [`${c.name}-${c.section}`, c]));

  await insertMany("teacher_profiles",
    ["id", "tenant_id", "user_id", "employee_id", "designation", "department", "subjects", "qualification", "joining_date", "date_of_birth", "gender", "blood_group", "phone", "address", "base_salary"],
    teacherRecords.map((t) => [t.profileId, tenantId, t.userId, t.employeeId, t.designation, t.department, t.subject, t.qualification, t.joining, t.dob, t.gender, t.bloodGroup, t.phone, `${pick(AREAS)}, Dhaka`, t.salary]));

  // --- teacher_subject_assignments: each teacher teaches their subject in every class
  const tsaRows = [];
  for (const t of teacherRecords) {
    const subject = subjectByName.get(t.subject);
    for (const c of classRecords) {
      tsaRows.push([createId("tsa"), tenantId, t.userId, subject.id, c.id, sessionId]);
    }
  }
  await insertMany("teacher_subject_assignments", ["id", "tenant_id", "teacher_id", "subject_id", "class_id", "session_id"], tsaRows);

  // --- Admin & accountant -----------------------------------------------------
  const adminUserId = createId("user");
  const accountantUserId = createId("user");
  await insertMany("users", ["id", "tenant_id", "name", "email", "password_hash", "role", "status"], [
    [adminUserId, tenantId, "Fatema Begum", "admin@greenfieldacademy.edu.bd", adminHash, "admin", "active"],
    [accountantUserId, tenantId, "Nazmul Haque", "accounts@greenfieldacademy.edu.bd", accountantHash, "accountant", "active"],
  ]);

  // --- Grading policies ---------------------------------------------------
  await insertMany("grading_policies", ["id", "tenant_id", "name", "min_percent", "max_percent", "grade", "grade_point", "is_passing"],
    GRADES.map((g) => [createId("grade"), tenantId, `Grade ${g.grade}`, g.min, g.max, g.grade, g.gp, !g.fail]));

  // --- Students, guardians, student_profiles, guardian_students -------------
  const students = [];
  let globalIndex = 0;
  let maleCursor = 0, femaleCursor = 0;
  for (const c of classRecords) {
    for (let roll = 1; roll <= 5; roll++) {
      globalIndex += 1;
      const isMale = globalIndex % 2 === 1;
      const firstName = isMale ? STUDENT_MALE[maleCursor++ % STUDENT_MALE.length] : STUDENT_FEMALE[femaleCursor++ % STUDENT_FEMALE.length];
      const surname = SURNAMES[globalIndex % SURNAMES.length];
      const birthYear = 2026 - c.ageBase;
      const dob = isoDate(birthYear, randInt(1, 12), randInt(1, 28));
      const admissionYear = 2026 - randInt(1, 5);
      students.push({
        index: globalIndex,
        name: `${firstName} ${surname}`,
        gender: isMale ? "Male" : "Female",
        classRec: c,
        roll: pad(roll),
        dob,
        admissionDate: isoDate(admissionYear, 1, randInt(5, 20)),
        bloodGroup: pick(BLOOD_GROUPS),
        area: pick(AREAS),
        userId: createId("user"),
        profileId: createId("student"),
        email: `s${pad(globalIndex, 3)}.${firstName.toLowerCase()}@greenfieldacademy.edu.bd`,
        studentId: `GA-2026-${pad(globalIndex, 3)}`,
      });
    }
  }
  await insertMany("users", ["id", "tenant_id", "name", "email", "password_hash", "role", "status"],
    students.map((s) => [s.userId, tenantId, s.name, s.email, studentHash, "student", "active"]));

  const guardians = students.map((s) => {
    const isFather = rand() < 0.75;
    const guardianFirst = isFather ? pick(ADULT_MALE) : pick(ADULT_FEMALE);
    const surname = s.name.split(" ").slice(-1)[0];
    const titledName = isFather ? `Md. ${guardianFirst} ${surname}` : `Mst. ${guardianFirst} ${surname}`;
    return {
      studentIndex: s.index,
      name: titledName,
      relation: isFather ? "Father" : "Mother",
      phone: `01${pick(["7", "8", "9"])}${randInt(10000000, 99999999)}`,
      email: `g${pad(s.index, 3)}.${guardianFirst.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      userId: createId("user"),
    };
  });
  await insertMany("users", ["id", "tenant_id", "name", "email", "password_hash", "role", "status"],
    guardians.map((g) => [g.userId, tenantId, g.name, g.email, guardianHash, "guardian", "active"]));

  await insertMany("student_profiles",
    ["id", "tenant_id", "user_id", "student_id", "class_name", "section", "roll_number", "admission_date", "date_of_birth", "gender", "blood_group", "phone", "address", "guardian_name", "guardian_phone", "guardian_relation", "class_id"],
    students.map((s, i) => {
      const g = guardians[i];
      return [s.profileId, tenantId, s.userId, s.studentId, s.classRec.name, s.classRec.section, s.roll, s.admissionDate, s.dob, s.gender, s.bloodGroup, "", `House ${randInt(1, 40)}, Road ${randInt(1, 20)}, ${s.area}, Dhaka`, g.name, g.phone, g.relation, s.classRec.id];
    }));

  await insertMany("guardian_students", ["id", "tenant_id", "guardian_user_id", "student_user_id"],
    guardians.map((g, i) => [createId("gs"), tenantId, g.userId, students[i].userId]));

  const studentsByClass = new Map();
  for (const s of students) {
    const key = s.classRec.id;
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(s);
  }

  // --- Class routines (Sat-Thu x 6 periods x 6 classes, rotating subjects) --
  const routineRows = [];
  CLASSES.forEach((_, classIdx) => {
    const c = classRecords[classIdx];
    SCHOOL_DAYS.forEach((day, dayIdx) => {
      PERIODS.forEach((p, periodIdx) => {
        const subjectIdx = (classIdx + dayIdx + periodIdx) % SUBJECTS.length;
        const subject = SUBJECTS[subjectIdx];
        const teacher = teacherRecords.find((t) => t.subject === subject.name);
        routineRows.push([createId("routine"), tenantId, c.id, day, p.n, subject.name, teacher.userId, p.start, p.end, `Room ${101 + classIdx}`]);
      });
    });
  });
  await insertMany("class_routines", ["id", "tenant_id", "class_id", "day_of_week", "period_number", "subject", "teacher_id", "start_time", "end_time", "room"], routineRows);

  // --- Syllabus entries (core subjects per class) ---------------------------
  const syllabusRows = [];
  for (const c of classRecords) {
    for (const subjectName of CORE_SUBJECTS) {
      syllabusRows.push([createId("syllabus"), tenantId, c.id, subjectName, `${subjectName} Syllabus - ${c.name}`, `Full-year curriculum coverage for ${subjectName} in ${c.name}, section ${c.section}, session 2026.`, randInt(8, 14)]);
    }
  }
  await insertMany("syllabus_entries", ["id", "tenant_id", "class_id", "subject", "title", "description", "chapter_count"], syllabusRows);

  // --- Exams, schedules, results ---------------------------------------------
  const exam1 = { id: createId("exam"), name: "First Term Assessment", status: "completed", termId: terms[0].id };
  const exam2 = { id: createId("exam"), name: "Half-Yearly Examination", status: "completed", termId: terms[1].id };
  const exam3 = { id: createId("exam"), name: "Annual Examination", status: "scheduled", termId: terms[2].id };
  await insertMany("exams", ["id", "tenant_id", "session_id", "term_id", "name", "status"], [
    [exam1.id, tenantId, sessionId, exam1.termId, exam1.name, exam1.status],
    [exam2.id, tenantId, sessionId, exam2.termId, exam2.name, exam2.status],
    [exam3.id, tenantId, sessionId, exam3.termId, exam3.name, exam3.status],
  ]);

  function buildExamSchedule(exam, startDate) {
    const rows = [];
    const d = new Date(startDate);
    let dayOffset = 0;
    for (const c of classRecords) {
      CORE_SUBJECTS.forEach((subjectName, si) => {
        const examDate = new Date(d);
        examDate.setDate(examDate.getDate() + dayOffset);
        const dateStr = isoDate(examDate.getFullYear(), examDate.getMonth() + 1, examDate.getDate());
        rows.push({
          id: createId("exsch"), examId: exam.id, classId: c.id, subjectName, examName: exam.name, date: dateStr,
        });
        dayOffset = (dayOffset + 1) % 5;
      });
    }
    return rows;
  }
  const schedule1 = buildExamSchedule(exam1, "2026-03-09");
  const schedule2 = buildExamSchedule(exam2, "2026-06-08");
  const schedule3 = buildExamSchedule(exam3, "2026-11-16");

  await insertMany("exam_schedules", ["id", "tenant_id", "class_id", "exam_name", "subject", "exam_date", "start_time", "end_time", "total_marks", "room", "exam_id"],
    [...schedule1, ...schedule2, ...schedule3].map((r) => [r.id, tenantId, r.classId, r.examName, r.subjectName, r.date, "10:00", "12:00", 100, "Main Hall", r.examId]));

  // Exam results: each student has a baseline aptitude with per-subject
  // variance; term 2 marks trend slightly above term 1 for a nicer story.
  const baseline = new Map(students.map((s) => [s.userId, randInt(58, 92)]));
  function marksFor(studentUserId, improve) {
    const base = baseline.get(studentUserId) + (improve ? randInt(0, 8) : 0);
    const variance = randInt(-8, 8);
    return Math.max(28, Math.min(99, base + variance));
  }
  function buildResults(scheduleRows, improve) {
    const rows = [];
    for (const sched of scheduleRows) {
      const classStudents = studentsByClass.get(sched.classId) || [];
      for (const s of classStudents) {
        const marks = marksFor(s.userId, improve);
        const g = gradeFor(marks);
        rows.push([createId("exres"), tenantId, sched.id, s.userId, marks, g.grade, marks >= 80 ? "Excellent performance." : marks < 40 ? "Needs improvement; guardian meeting recommended." : ""]);
      }
    }
    return rows;
  }
  await insertMany("exam_results", ["id", "tenant_id", "exam_schedule_id", "student_user_id", "marks_obtained", "grade", "remarks"],
    [...buildResults(schedule1, false), ...buildResults(schedule2, true)]);

  // --- Attendance (last 8 school days before today) --------------------------
  const attendanceDays = lastSchoolDays(8, TODAY);
  const attendanceRows = [];
  const correctionRows = [];
  for (const s of students) {
    const teacher = classRecords.find((c) => c.id === s.classRec.id);
    const markedBy = teacher.classTeacherId || adminUserId;
    for (const { date } of attendanceDays) {
      const roll = rand();
      const status = roll < 0.90 ? "present" : roll < 0.95 ? "absent" : roll < 0.98 ? "late" : "excused";
      const alertSent = status === "absent" && rand() < 0.6;
      attendanceRows.push([
        createId("att"), tenantId, s.classRec.id, s.userId, date, 0, status, markedBy, "",
        status === "absent" ? pick(["Sick", "Family emergency", "Not informed"]) : "",
        alertSent, alertSent ? new Date().toISOString() : null,
      ]);
    }
  }
  await insertMany("attendance_records",
    ["id", "tenant_id", "class_id", "student_user_id", "attendance_date", "period_number", "status", "marked_by_id", "note", "absence_reason", "guardian_alert_sent", "guardian_alert_sent_at"],
    attendanceRows);

  // A couple of correction requests for realism
  const sampleStudents = [students[2], students[9]];
  for (const s of sampleStudents) {
    const day = attendanceDays[attendanceDays.length - 2];
    correctionRows.push([
      createId("attcorr"), tenantId, null, s.classRec.id, s.userId, day.date, 0, "present", "Was present, marked absent by mistake.",
      "Please review CCTV / class register.", s === sampleStudents[0] ? "approved" : "pending",
      s.classRec.classTeacherId || adminUserId, s === sampleStudents[0] ? adminUserId : null, s === sampleStudents[0] ? new Date().toISOString() : null,
      s === sampleStudents[0] ? "Verified with class register. Corrected." : "",
    ]);
  }
  await insertMany("attendance_correction_requests",
    ["id", "tenant_id", "attendance_id", "class_id", "student_user_id", "attendance_date", "period_number", "requested_status", "requested_reason", "request_note", "status", "requested_by", "reviewed_by", "reviewed_at", "review_note"],
    correctionRows);

  // A sample promotion record to show the academic-movements feature (moved
  // up from a prior-year class that has no records in this session).
  const movedStudent = students[15];
  await insertMany("student_academic_movements",
    ["id", "tenant_id", "student_user_id", "movement_type", "from_class_id", "to_class_id", "from_section", "to_section", "from_session_id", "to_session_id", "effective_date", "reason", "created_by"],
    [[createId("mv"), tenantId, movedStudent.userId, "promotion", null, movedStudent.classRec.id, "", movedStudent.classRec.section, null, sessionId, "2026-01-05", "Promoted to next grade for academic session 2026.", adminUserId]]);

  // --- Notices ----------------------------------------------------------------
  const notices = [
    { type: "notice", audience: "public", title: "Half-Yearly Examination Results Published", body: "Half-Yearly Examination results for Classes VI to X are now published. Guardians can view results through the guardian portal.", publishedAt: "2026-07-05" },
    { type: "notice", audience: "public", title: "Parent-Teacher Meeting — Saturday, 18 July 2026", body: "A Parent-Teacher meeting will be held on Saturday, 18 July 2026 at 10:00 AM in the school auditorium. All guardians are requested to attend.", publishedAt: "2026-07-08" },
    { type: "notice", audience: "public", title: "Annual Examination Routine — Classes VI to X", body: "The Annual Examination for Classes VI to X will be held from 16 November 2026. The detailed subject-wise routine will be shared soon.", publishedAt: "2026-07-10" },
    { type: "notice", audience: "all_portal", title: "Library Books Return Reminder", body: "All borrowed library books must be returned before the summer break begins. Please clear any pending returns with the librarian.", publishedAt: "2026-07-09" },
    { type: "notice", audience: "teacher", title: "Submit Half-Yearly Mark Sheets by 15 July", body: "All subject teachers must submit Half-Yearly Examination mark sheets to the academic office by 15 July 2026.", publishedAt: "2026-07-06" },
    { type: "news", audience: "public", title: "Greenfield Students Win Gold at District Science Fair 2026", body: "Students from Class Nine represented Greenfield Academy at the District Science Fair 2026 and won the Gold medal in the Innovation category.", publishedAt: "2026-06-20" },
    { type: "news", audience: "public", title: "New Computer Lab Inaugurated with 40 Modern Workstations", body: "Greenfield Academy inaugurated a new Computer Lab equipped with 40 modern workstations to strengthen ICT education for all classes.", publishedAt: "2026-05-15" },
  ];
  await insertMany("notices", ["id", "tenant_id", "type", "title", "body", "audience", "is_published", "published_at", "created_by"],
    notices.map((n) => [createId("notice"), tenantId, n.type, n.title, n.body, n.audience, true, n.publishedAt, adminUserId]));

  // --- Gallery: copy real campus photos so the URLs actually resolve --------
  const campusSrcDir = path.join(projectRoot, "frontend", "src", "assets", "landing", "sites", "greenfield-academy", "campus");
  const galleryDestDir = path.join(publicUploadsPath, "gallery");
  fs.mkdirSync(galleryDestDir, { recursive: true });
  const campusPhotos = [
    { file: "teacher-class.jpg", caption: "Engaged Classrooms" },
    { file: "active-learning.jpg", caption: "Active Learning" },
    { file: "study-time.jpg", caption: "Focused Study Time" },
    { file: "modern-classroom.jpg", caption: "Modern Classrooms" },
    { file: "science-lab.jpg", caption: "Science Laboratory" },
    { file: "experiments.jpg", caption: "Hands-on Experiments" },
    { file: "library.jpg", caption: "Well-Stocked Library" },
    { file: "digital-learning.jpg", caption: "Digital Learning" },
  ];
  const galleryRows = [];
  campusPhotos.forEach((p, idx) => {
    const srcPath = path.join(campusSrcDir, p.file);
    if (!fs.existsSync(srcPath)) return;
    const id = createId("gallery");
    const destName = `${id}.jpg`;
    fs.copyFileSync(srcPath, path.join(galleryDestDir, destName));
    galleryRows.push([id, tenantId, "photo", `/uploads/gallery/${destName}`, p.caption, idx + 1]);
  });
  await insertMany("gallery_items", ["id", "tenant_id", "type", "url", "caption", "sort_order"], galleryRows);

  // --- Admission applications + a couple of real placeholder documents ------
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function referenceCode() {
    let out = "ADM-";
    for (let i = 0; i < 6; i++) out += CODE_CHARS[randInt(0, CODE_CHARS.length - 1)];
    return out;
  }
  const applications = [
    { name: "Meherun Nesa", cls: "Class Six", status: "submitted", guardian: "Md. Kabir Hossain", phone: "01711009911", email: "kabir.hossain@gmail.com", prev: pick(PREV_SCHOOLS), notes: "" },
    { name: "Sajid Rahman", cls: "Class Seven", status: "under_review", guardian: "Rina Akter", phone: "01822110033", email: "rina.akter@gmail.com", prev: pick(PREV_SCHOOLS), notes: "Awaiting transfer certificate." },
    { name: "Tanjila Ferdous", cls: "Class Six", status: "test_scheduled", guardian: "Md. Aynal Haque", phone: "01933221144", email: "aynal.haque@gmail.com", prev: pick(PREV_SCHOOLS), notes: "", testDate: "2026-07-20" },
    { name: "Rakibul Hasan", cls: "Class Eight", status: "accepted", guardian: "Mst. Fahima Begum", phone: "01644332255", email: "fahima.begum@gmail.com", prev: pick(PREV_SCHOOLS), notes: "Seat confirmed for session 2026." },
    { name: "Wasim Akram", cls: "Class Six", status: "rejected", guardian: "Md. Selim Reza", phone: "01755443366", email: "selim.reza@gmail.com", prev: pick(PREV_SCHOOLS), notes: "Seats full for the applied class." },
  ];
  const applicationRows = applications.map((a) => ({ ...a, id: createId("adm"), refCode: referenceCode(), dob: isoDate(2026 - 11, randInt(1, 12), randInt(1, 28)), gender: pick(["Male", "Female"]) }));
  await insertMany("admission_applications",
    ["id", "tenant_id", "reference_code", "applicant_name", "date_of_birth", "gender", "applying_for_class", "guardian_name", "guardian_phone", "guardian_email", "previous_school", "status", "admission_test_date", "notes"],
    applicationRows.map((a) => [a.id, tenantId, a.refCode, a.name, a.dob, a.gender, a.cls, a.guardian, a.phone, a.email, a.prev, a.status, a.testDate || null, a.notes]));

  const docsDir = path.join(backendRoot, "storage", "admission-documents");
  fs.mkdirSync(docsDir, { recursive: true });
  const MINIMAL_PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>", "utf8");
  const acceptedApp = applicationRows.find((a) => a.status === "accepted");
  const reviewApp = applicationRows.find((a) => a.status === "under_review");
  const admissionDocs = [
    { app: acceptedApp, type: "birth_certificate", name: "birth_certificate.pdf", verification: "verified", verifiedBy: adminUserId },
    { app: acceptedApp, type: "guardian_identity", name: "guardian_nid.pdf", verification: "verified", verifiedBy: adminUserId },
    { app: reviewApp, type: "previous_school_certificate", name: "school_certificate.pdf", verification: "pending", verifiedBy: null },
  ];
  const admissionDocRows = admissionDocs.map((d) => {
    const storageKey = `${createId("doc")}.pdf`;
    fs.writeFileSync(path.join(docsDir, storageKey), MINIMAL_PDF);
    return [createId("admdoc"), d.app.id, d.type, d.name, "application/pdf", MINIMAL_PDF.length, storageKey, d.verification, "", d.verifiedBy, d.verification === "verified" ? new Date().toISOString() : null];
  });
  await insertMany("admission_documents",
    ["id", "application_id", "document_type", "original_name", "mime_type", "file_size", "storage_key", "verification_status", "verification_notes", "verified_by", "verified_at"],
    admissionDocRows);

  // --- Fee categories, structures, assignments --------------------------------
  const feeCategories = [
    { key: "tuition", name: "Tuition Fee", cycle: "monthly", lateFee: 100, defaultAmount: 1400 },
    { key: "transport", name: "Transport Fee", cycle: "monthly", lateFee: 50, defaultAmount: 800 },
    { key: "session", name: "Session Fee", cycle: "annual", lateFee: 0, defaultAmount: 3000 },
    { key: "exam", name: "Exam Fee", cycle: "term", lateFee: 0, defaultAmount: 500 },
    { key: "library", name: "Library Fee", cycle: "annual", lateFee: 0, defaultAmount: 300 },
  ];
  const catRecords = feeCategories.map((c) => ({ ...c, id: createId("fee_cat") }));
  await insertMany("fee_categories", ["id", "tenant_id", "name", "description", "default_amount", "billing_cycle", "late_fee_amount", "is_active"],
    catRecords.map((c) => [c.id, tenantId, c.name, `${c.name} for Greenfield Academy.`, c.defaultAmount, c.cycle, c.lateFee, true]));
  const catByKey = new Map(catRecords.map((c) => [c.key, c]));

  const structureRows = [];
  for (const c of classRecords) {
    structureRows.push([createId("fee_str"), tenantId, c.id, catByKey.get("tuition").id, c.tuition, true]);
  }
  structureRows.push([createId("fee_str"), tenantId, null, catByKey.get("session").id, 3000, true]);
  structureRows.push([createId("fee_str"), tenantId, null, catByKey.get("exam").id, 500, true]);
  structureRows.push([createId("fee_str"), tenantId, null, catByKey.get("library").id, 300, true]);
  await insertMany("fee_structures", ["id", "tenant_id", "class_id", "category_id", "amount", "is_active"], structureRows);

  // Transport: only ~40% of students opt in. Two merit scholarships on tuition.
  const transportStudents = students.filter((_, i) => i % 5 === 0 || i % 5 === 2); // 12 students
  const assignmentRows = transportStudents.map((s) => [
    createId("fee_asg"), tenantId, s.userId, catByKey.get("transport").id, 800, 0, 0, 0, 0, "2026-01", "", "active", "Opted into school transport.",
  ]);
  const scholarshipStudents = [students[0], students[20]];
  for (const s of scholarshipStudents) {
    assignmentRows.push([
      createId("fee_asg"), tenantId, s.userId, catByKey.get("tuition").id, s.classRec.tuition, 0, 0, 500, 0, "2026-01", "", "active", "Merit scholarship — 500 BDT monthly tuition waiver.",
    ]);
  }
  await insertMany("fee_assignments",
    ["id", "tenant_id", "student_user_id", "category_id", "amount", "discount_amount", "waiver_amount", "scholarship_amount", "fine_amount", "start_period", "end_period", "status", "notes"],
    assignmentRows);
  const transportSet = new Set(transportStudents.map((s) => s.userId));
  const scholarshipMap = new Map(scholarshipStudents.map((s) => [s.userId, 500]));

  // --- Invoices + items + payments --------------------------------------------
  const RECEIPT_STAMP = "20260710";
  let receiptCounter = 100000;
  function nextReceipt() { receiptCounter += randInt(1, 7); return `RCPT-${RECEIPT_STAMP}-${receiptCounter}`; }

  const invoiceRows = [];
  const itemRows = [];
  const paymentRows = [];

  function addInvoice(student, period, title, dueDate, items, payFraction, payDateBase) {
    const invoiceId = createId("fee_inv");
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const scholarship = items.reduce((s, it) => s + it.scholarship, 0);
    const total = items.reduce((s, it) => s + (it.amount - it.scholarship), 0);
    let paid = 0;
    if (payFraction >= 1) paid = total;
    else if (payFraction > 0) paid = Math.round(total * payFraction);
    const status = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

    invoiceRows.push([invoiceId, tenantId, student.userId, period, title, dueDate, subtotal, 0, 0, scholarship, 0, total, paid, status, false, ""]);
    for (const it of items) {
      itemRows.push([createId("fee_item"), invoiceId, it.categoryId, null, it.name, it.amount, 0, 0, it.scholarship, 0, it.amount - it.scholarship]);
    }
    if (paid > 0) {
      const payDate = isoDate(Number(payDateBase.slice(0, 4)), Number(payDateBase.slice(5, 7)), randInt(1, 9));
      paymentRows.push([createId("fee_pay"), tenantId, invoiceId, student.userId, nextReceipt(), paid, pick(["cash", "bkash", "bank", "nagad"]), payDate, "", "", accountantUserId]);
    }
    return invoiceId;
  }

  const monthPlans = [
    { period: "2026-05", due: "2026-05-10", payDist: [0.85, 0.10, 0.05] },
    { period: "2026-06", due: "2026-06-10", payDist: [0.75, 0.15, 0.10] },
    { period: "2026-07", due: "2026-07-10", payDist: [0.50, 0.25, 0.25] },
  ];
  for (const plan of monthPlans) {
    for (const s of students) {
      const scholarship = scholarshipMap.get(s.userId) || 0;
      const items = [{ categoryId: catByKey.get("tuition").id, name: "Tuition Fee", amount: s.classRec.tuition, scholarship }];
      if (transportSet.has(s.userId)) items.push({ categoryId: catByKey.get("transport").id, name: "Transport Fee", amount: 800, scholarship: 0 });
      const roll = rand();
      const fraction = roll < plan.payDist[0] ? 1 : roll < plan.payDist[0] + plan.payDist[1] ? (rand() < 0.5 ? 0.4 : 0.6) : 0;
      addInvoice(s, plan.period, `Monthly Fees - ${plan.period}`, plan.due, items, fraction, plan.due);
    }
  }
  for (const s of students) {
    const items = [
      { categoryId: catByKey.get("session").id, name: "Session Fee", amount: 3000, scholarship: 0 },
      { categoryId: catByKey.get("library").id, name: "Library Fee", amount: 300, scholarship: 0 },
    ];
    const roll = rand();
    const fraction = roll < 0.90 ? 1 : roll < 0.97 ? 0.5 : 0;
    addInvoice(s, "2026-ANNUAL", "Annual Fees - Session 2026", "2026-01-20", items, fraction, "2026-01");
  }

  await insertMany("fee_invoices",
    ["id", "tenant_id", "student_user_id", "period", "title", "due_date", "subtotal_amount", "discount_amount", "waiver_amount", "scholarship_amount", "fine_amount", "total_amount", "paid_amount", "status", "fine_applied", "notes"],
    invoiceRows);
  await insertMany("fee_invoice_items",
    ["id", "invoice_id", "category_id", "assignment_id", "description", "amount", "discount_amount", "waiver_amount", "scholarship_amount", "fine_amount", "total_amount"],
    itemRows);
  await insertMany("fee_payments",
    ["id", "tenant_id", "invoice_id", "student_user_id", "receipt_number", "amount", "method", "payment_date", "reference_no", "notes", "collected_by"],
    paymentRows);

  // --- Non-teaching staff ------------------------------------------------------
  const STAFF = [
    { name: "Md. Aminul Islam", designation: "Office Assistant", department: "Administration", qualification: "SSC", salary: 15000, staffType: "admin" },
    { name: "Rehana Parvin", designation: "Librarian", department: "Library", qualification: "B.A in Library Science", salary: 18000, staffType: "support" },
    { name: "Md. Jasim Uddin", designation: "Security Guard", department: "Security", qualification: "SSC", salary: 13000, staffType: "support" },
    { name: "Salma Khatun", designation: "Cleaner", department: "Maintenance", qualification: "Primary", salary: 10000, staffType: "non_teaching" },
    { name: "Md. Habibur Rahman", designation: "Lab Assistant", department: "Science", qualification: "HSC", salary: 14000, staffType: "support" },
  ];
  const staffRecords = STAFF.map((s, i) => ({
    ...s, id: createId("staff"), employeeId: `GA-STF-${pad(i + 1, 3)}`,
    phone: `018${randInt(10000000, 99999999)}`, joining: isoDate(randInt(2016, 2023), randInt(1, 12), randInt(1, 28)),
  }));
  await insertMany("staff_profiles",
    ["id", "tenant_id", "staff_type", "name", "employee_id", "designation", "department", "qualification", "phone", "email", "address", "joining_date", "contract_type", "base_salary", "status"],
    staffRecords.map((s) => [s.id, tenantId, s.staffType, s.name, s.employeeId, s.designation, s.department, s.qualification, s.phone, "", `${pick(AREAS)}, Dhaka`, s.joining, "permanent", s.salary, "active"]));

  const staffAttendanceRows = [];
  for (const s of staffRecords) {
    for (const { date } of attendanceDays) {
      const roll = rand();
      const status = roll < 0.93 ? "present" : roll < 0.98 ? "late" : "absent";
      staffAttendanceRows.push([createId("satt"), tenantId, s.id, date, status, "", adminUserId]);
    }
  }
  await insertMany("staff_attendance", ["id", "tenant_id", "staff_id", "attendance_date", "status", "note", "marked_by"], staffAttendanceRows);

  await insertMany("staff_leave_requests", ["id", "tenant_id", "staff_id", "leave_type", "start_date", "end_date", "reason", "status", "reviewed_by", "reviewed_at"], [
    [createId("leave"), tenantId, staffRecords[1].id, "sick", "2026-06-15", "2026-06-17", "Fever and viral infection.", "approved", adminUserId, "2026-06-14T10:00:00Z"],
    [createId("leave"), tenantId, staffRecords[3].id, "casual", "2026-07-20", "2026-07-21", "Family function.", "pending", null, null],
    [createId("leave"), tenantId, staffRecords[2].id, "unpaid", "2026-05-05", "2026-05-10", "Personal travel.", "rejected", adminUserId, "2026-05-02T09:00:00Z"],
  ]);

  await insertMany("staff_documents", ["id", "tenant_id", "staff_id", "document_type", "title", "file_url", "notes"], [
    [createId("sdoc"), tenantId, staffRecords[0].id, "joining", "Appointment Letter", "", "Issued on joining."],
    [createId("sdoc"), tenantId, staffRecords[1].id, "certificate", "Library Science Certificate", "", ""],
  ]);
  await insertMany("staff_performance_notes", ["id", "tenant_id", "staff_id", "note", "rating", "created_by"], [
    [createId("spn"), tenantId, staffRecords[4].id, "Very attentive during science practical sessions; equipment always ready on time.", 5, adminUserId],
    [createId("spn"), tenantId, staffRecords[0].id, "Reliable with front-desk correspondence and guardian queries.", 4, adminUserId],
  ]);

  // --- Payroll: teachers + staff for May & June (paid) and July (draft) ------
  const payrollRows = [];
  const payrollPeople = [
    ...teacherRecords.map((t) => ({ teacherId: t.profileId, staffId: null, salary: t.salary })),
    ...staffRecords.map((s) => ({ teacherId: null, staffId: s.id, salary: s.salary })),
  ];
  for (const period of ["2026-05", "2026-06"]) {
    for (const p of payrollPeople) {
      const allowances = Math.round(p.salary * 0.05);
      const deductions = Math.round(p.salary * 0.02);
      const net = p.salary + allowances - deductions;
      payrollRows.push([createId("payroll"), tenantId, p.staffId, period, p.salary, allowances, deductions, net, "paid", `${period}-28`, "", "bank", p.teacherId]);
    }
  }
  for (const p of payrollPeople) {
    const allowances = Math.round(p.salary * 0.05);
    const deductions = Math.round(p.salary * 0.02);
    const net = p.salary + allowances - deductions;
    payrollRows.push([createId("payroll"), tenantId, p.staffId, "2026-07", p.salary, allowances, deductions, net, "draft", null, "Pending end-of-month processing.", "bank", p.teacherId]);
  }
  await insertMany("staff_payroll_records",
    ["id", "tenant_id", "staff_id", "period", "base_salary", "allowances", "deductions", "net_salary", "status", "paid_at", "notes", "method", "teacher_id"],
    payrollRows);

  // --- Expenses & donations ----------------------------------------------------
  const expenseRows = [
    { category: "Utilities", payee: "DESCO", amount: 12500, date: "2026-05-05", method: "bank", notes: "Electricity bill - May 2026." },
    { category: "Utilities", payee: "DESCO", amount: 13200, date: "2026-06-05", method: "bank", notes: "Electricity bill - June 2026." },
    { category: "Utilities", payee: "WASA", amount: 3400, date: "2026-06-06", method: "cash", notes: "Water bill - June 2026." },
    { category: "Utilities", payee: "Link3 Technologies", amount: 4500, date: "2026-06-01", method: "bank", notes: "Internet bill - June 2026." },
    { category: "Supplies", payee: "Rahman Stationery House", amount: 8200, date: "2026-06-12", method: "cash", notes: "Office and classroom stationery." },
    { category: "Maintenance", payee: "City Builders", amount: 22000, date: "2026-04-18", method: "bank", notes: "Classroom ceiling and wiring repair." },
    { category: "Sports", payee: "Champion Sports House", amount: 9600, date: "2026-03-02", method: "cash", notes: "Sports equipment for Annual Sports Day." },
    { category: "Lab Supplies", payee: "Scientific Traders", amount: 6700, date: "2026-05-20", method: "nagad", notes: "Science lab chemicals and glassware." },
    { category: "Printing", payee: "Modern Printing Press", amount: 5300, date: "2026-06-25", method: "cash", notes: "Half-Yearly exam question papers and mark sheets." },
  ];
  await insertMany("expenses", ["id", "tenant_id", "category", "amount", "expense_date", "payee", "method", "reference_no", "notes", "created_by"],
    expenseRows.map((e) => [createId("exp"), tenantId, e.category, e.amount, e.date, e.payee, e.method, "", e.notes, accountantUserId]));

  const donationRows = [
    { donor: "Greenfield Alumni Association", amount: 25000, date: "2026-01-25", method: "bank", notes: "Annual alumni contribution toward library development." },
    { donor: "Mr. Kamal Uddin (Guardian)", amount: 5000, date: "2026-03-10", method: "cash", notes: "Contribution toward Science Fair expenses." },
    { donor: "Bright Future Foundation", amount: 15000, date: "2026-06-02", method: "bank", notes: "Support for underprivileged student scholarships." },
  ];
  await insertMany("donations", ["id", "tenant_id", "donor_name", "amount", "donation_date", "method", "notes", "received_by"],
    donationRows.map((d) => [createId("donation"), tenantId, d.donor, d.amount, d.date, d.method, d.notes, accountantUserId]));

  // --- Communication threads & messages ---------------------------------------
  const teacherByName = new Map(teacherRecords.map((t) => [t.name, t]));
  const commThreads = [
    {
      topic: "Attendance concern", student: students[3], guardianSide: true,
      messages: [
        { fromGuardian: true, body: "Assalamu Alaikum, I noticed my child was marked absent yesterday but he was actually in school. Could you please check?" },
        { fromGuardian: false, body: "Walaikum Assalam, thank you for flagging this. I've submitted an attendance correction request — it will be reviewed by the admin office shortly." },
      ],
    },
    {
      topic: "Fee due reminder", student: students[7], guardianSide: true, admin: true,
      messages: [
        { fromGuardian: false, body: "This is a reminder that the July tuition invoice is due on 10 July 2026. Please clear the due amount at your earliest convenience." },
        { fromGuardian: true, body: "Noted, I will pay by this weekend at the accounts office." },
      ],
    },
    {
      topic: "Homework clarification - Mathematics", student: students[12], teacherName: "Nusrat Jahan", guardianSide: true,
      messages: [
        { fromGuardian: true, body: "Could you clarify which chapter's exercises are due for Monday? My child mentioned two different chapters." },
        { fromGuardian: false, body: "It's Chapter 7, exercises 7.2 and 7.3 only. I'll also post it on the class notice board." },
        { fromGuardian: true, body: "Thank you, that's helpful." },
      ],
    },
    {
      topic: "Parent-Teacher meeting request", student: students[20], admin: true, guardianSide: true,
      messages: [
        { fromGuardian: true, body: "I would like to request a short meeting regarding my daughter's progress in Science before the PTM date if possible." },
        { fromGuardian: false, body: "Certainly, please come by the office on Thursday afternoon and we'll arrange a slot with her subject teacher." },
      ],
    },
    {
      topic: "Transport timing query", student: students[24], admin: true, guardianSide: true,
      messages: [
        { fromGuardian: true, body: "Does the school transport cover the Bashundhara R/A route in the morning? What time does it arrive?" },
        { fromGuardian: false, body: "Yes, the Bashundhara route pickup is around 7:10 AM. I'll share the full route sheet with you." },
      ],
    },
  ];

  const threadRows = [];
  const messageRows = [];
  for (const t of commThreads) {
    const guardian = guardians[t.student.index - 1];
    const teacher = t.teacherName ? teacherByName.get(t.teacherName) : (t.student.classRec.classTeacherId ? teacherRecords.find((tt) => tt.userId === t.student.classRec.classTeacherId) : null);
    const otherUserId = t.admin ? adminUserId : (teacher ? teacher.userId : adminUserId);
    const threadId = createId("thread");
    threadRows.push([
      threadId, tenantId, t.topic, t.student.userId, guardian.userId, teacher ? teacher.userId : null, t.admin ? adminUserId : null,
      guardian.userId, guardian.userId, otherUserId,
    ]);
    let lastCreated = new Date("2026-07-08T09:00:00Z").getTime();
    t.messages.forEach((m, mi) => {
      const senderId = m.fromGuardian ? guardian.userId : otherUserId;
      const recipientId = m.fromGuardian ? otherUserId : guardian.userId;
      const isLast = mi === t.messages.length - 1;
      messageRows.push([
        createId("msg"), threadId, tenantId, senderId, recipientId, m.body,
        isLast ? null : new Date(lastCreated + 3600000).toISOString(),
      ]);
      lastCreated += 3600000 * 2;
    });
  }
  await insertMany("communication_threads",
    ["id", "tenant_id", "topic", "student_user_id", "guardian_user_id", "teacher_user_id", "admin_user_id", "created_by", "participant_one_user_id", "participant_two_user_id"],
    threadRows);
  await insertMany("communication_messages", ["id", "thread_id", "tenant_id", "sender_user_id", "recipient_user_id", "body", "read_at"], messageRows);

  // --- Contact messages (public site) -----------------------------------------
  await insertMany("contact_messages", ["id", "name", "phone", "message", "status"], [
    [createId("contact"), "Md. Rafiqul Islam", "01711223344", "Assalamu Alaikum, I want to know the admission process for Class Six for my son. Please advise the required documents and fees.", "NEW"],
    [createId("contact"), "Sultana Yasmin", "01822334455", "Hello, does Greenfield Academy provide school transport for the Uttara area? Please let me know the fare.", "RESOLVED"],
  ]);

  // --- Backfill finance_transactions ledger from what we just inserted -------
  console.log("Backfilling finance ledger...");
  await createSchema(client);

  console.log("Done. Seed summary:");
  console.log(`  Tenant: Greenfield Academy (${tenantId})`);
  console.log(`  Admin login:      admin@greenfieldacademy.edu.bd / Greenfield@2026`);
  console.log(`  Accountant login: accounts@greenfieldacademy.edu.bd / Accounts@2026`);
  console.log(`  Any teacher login (see teacher_profiles): <first>.<last>@greenfieldacademy.edu.bd / Teacher@2026`);
  console.log(`  Any student login: s0XX.<first>@greenfieldacademy.edu.bd / Student@2026`);
  console.log(`  Any guardian login: g0XX.<first>@gmail.com / Guardian@2026`);
  console.log(`  System developer:  ${process.env.DEFAULT_SYSTEM_DEVELOPER_EMAIL || "developer@school.local"} / ${process.env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD || "Developer@12345"}`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => client.end());
