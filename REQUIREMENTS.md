# School / Madrasha Website & Management System — Requirements

## Target Market & Scope

Selling to **individual, medium-size schools and madrashas — up to ~1,000 students
per institution**. This is not an enterprise/multi-thousand-student deployment, so
the priority is a solid, reliable core feature set per school rather than
heavyweight analytics, BI, or scale-oriented engineering. Each module below is
tagged **Core** (needed for a sellable v1) or **Later** (real, but defer until
core is solid — don't gold-plate this before the basics are done).

Online payment gateway integration (bKash/Nagad/Rocket/bank) has been pulled out
of active scope per product decision — see "Deferred" section at the bottom.

---

## 1. 🏠 Home Page — Core

- Attractive and modern banner slider
- Institution overview
- Vision & Mission
- Chairman's / Principal's welcome message
- Important notices
- Latest news and updates
- Admission announcements
- Institution statistics (Students, Teachers, Departments, etc.)

**Status:** ✅ Built

---

## 2. 📖 About Us — Core

- Established year, history
- Vision & Mission
- Founder's profile
- Faculty and Staff profiles
- Organizational structure

**Status:** ⚙️ Partial — Vision/Mission done on Home page. Faculty/staff profiles
and org structure not built. Keep this simple: a photo + name + designation grid
is enough for this market — no need for an interactive org chart.

---

## 3. 🎓 Academic Portal — Core

- Class / Department information
- Class routine
- Syllabus
- Curriculum
- Examination schedule
- Examination results
- Online attendance

**Status:** ✅ Built (admin dashboard side) — Classes, routine, syllabus, exam
schedules, exam results, and attendance all have full backend
(controller/service/repository) and admin/teacher UI. Backend also exposes
`/academic/me/results` and `/academic/me/attendance` for self-service, but these
are not yet surfaced in the student-facing portal UI (see Student Portal below).

---

## 4. 📝 Online Admission — Core

- Digital admission application form
- Application status tracking
- Required document upload
- Admission test information
- Admission result publication

**Status:** ❌ Not built. This is often the single most valuable page on the
public website for a prospective-parent audience — worth prioritizing over
several "Later" items below. Keep document upload minimal for v1 (e.g. one photo
+ one ID/birth-certificate scan) rather than a generic multi-file uploader.

---

## 5. 🖼️ Media Gallery — Core

- Photo gallery
- Video gallery (embed links, e.g. YouTube — no need to host video ourselves)

**Status:** ✅ Built — Photo and video gallery are both admin-managed
(`gallery_items` table, Gallery admin page), rendered dynamically on the public
Home page. Videos are embedded by pasting a normal YouTube share link (no video
hosting needed).

---

## 6. 📚 Student Portal — Core

- Personal profile
- View examination results
- Class routine
- Attendance report
- Certificate download

**Status:** ✅ Built — Personal profile, exam results, attendance summary,
class routine, and a notices feed are all live in the student portal. Shared
rendering lives in `frontend/src/features/portal/components/` (`Card`,
`ResultsTable`, `AttendanceStats`, `RoutineList`, `NoticesFeed`) — Guardian
Portal and the new progress report page below all import the same components,
no duplicated UI code anywhere. "Certificate download" is a print-to-PDF view
(`/portal/report`, `ProgressReportPage.jsx`) using the browser's native print
dialog — a real PDF comes out the other end via "Save as PDF," but it's a
clean data printout, not a designed certificate template. Upgrade later with a
proper template/PDF library if a customer needs an official-looking document.

---

## 7. 👪 Guardian Portal — Core

- Guardian login linked to one or more students
- View ward's examination results
- View ward's attendance report
- Receive notices and announcements
- Download ward's progress report / certificate

**Status:** ✅ Built — Admin can link a guardian account to one or more
students (`guardian_students` table, "Manage Wards" action on the Users page).
Guardian portal shows a ward switcher, ward profile summary, exam results,
attendance summary, a notices feed (filtered server-side to
guardian-relevant audiences), and a "Print Report" button per ward using the
same print-to-PDF progress report as the Student Portal.

> Scoped down from the original spec: two-way messaging with teachers/admin has
> been dropped from Core. For a school this size, a one-way notice board
> (admin/teacher posts, guardian reads) covers the real need at a fraction of the
> build cost — see "Later" section.

---

## 8. 👨‍🏫 Teacher Portal — Core

- Class management
- Attendance management
- Result upload
- Student evaluation (simple remarks per student, not a formal appraisal system)
- Notice publication

**Status:** ✅ Built — Teachers have a real dashboard: logging in lands them on
`/dashboard` with an "Academic" section covering classes (view only), routine
and syllabus (edit; delete restricted to admin), attendance (full mark/save),
and results (full entry, including the per-student `remarks` field — this *is*
"student evaluation," not a separate appraisal feature), plus a "My Profile"
link back to their existing `/portal` profile view. Notice publication is a
"Publish Notice" quick action on the teacher's dashboard home, restricted to
non-public audiences (students/teachers/guardians/all-portal) — only admins
can post to the public website, enforced both in the UI (dropdown never offers
"Public") and the backend (`noticeService` rejects it even if attempted
directly). Exam *schedule* management (creating/editing/deleting exam dates,
rooms, total marks) intentionally stays admin-only, matching the backend's
`adminOnly` route — teachers pick from existing exams to enter results, they
don't schedule them.

---

## 9. ⚙️ Admin Dashboard — Core

- Student management
- Teacher management
- Guardian management
- Admission management
- Notice and news management
- Basic reports (headcounts, attendance %, pass rate — not a BI suite)
- Website content management (edit home page text/notices/gallery — not a
  general-purpose CMS)

**Status:** ⚙️ Partial — Login/session, contact message management, student
management, teacher management, academic module management
(classes/routine/syllabus/exams/results/attendance), and notice/news management
are done for the `admin` role, all scoped per tenant. Also includes a
platform-level `system_developer` layer for onboarding/managing tenant
organizations (multi-school SaaS). Website content management now covers
notices/news and the gallery (both admin-editable, reflected live on the public
site) — still not a general-purpose CMS for arbitrary home page text, which is
fine per scope. Guardian management (linking is done; broader guardian account
management still uses the shared Users page — fine as-is), admission
management, and basic reports (attendance %/pass rate) are not built.

---

## 10. 📞 Contact Us — Core

- Institution address
- Google Maps location
- Mobile number
- Email address
- Contact form
- Social media links

**Status:** ✅ Built

---

## Build Progress Summary

| # | Module | Priority | Status |
|---|--------|----------|--------|
| 1 | Home Page | Core | ✅ Done |
| 2 | About Us | Core | ⚙️ Partial |
| 3 | Academic Portal | Core | ✅ Done (admin/teacher back end + admin UI) |
| 4 | Online Admission | Core | ❌ Pending |
| 5 | Media Gallery | Core | ✅ Done (photo + video, admin-managed) |
| 6 | Student Portal | Core | ✅ Done (profile/results/attendance/routine/notices/print report) |
| 7 | Guardian Portal | Core | ✅ Done (linking, results/attendance/profile/notices/print report) |
| 8 | Teacher Portal | Core | ✅ Done (classes/routine/syllabus/attendance/results/notice publication) |
| 9 | Admin Dashboard | Core | ⚙️ Partial |
| 10 | Contact Us | Core | ✅ Done |

---

## Platform / Multi-Tenancy (already built, appropriately sized for this market)

- Every tenant (school/madrasha) is an isolated organization: `tenants` table,
  `tenant_id` scoping on all domain tables, unique slug per org.
- `system_developer` platform role can create/list/update tenants and toggle
  active/inactive status (`/platform/tenants/*`), independent of any single
  school's `admin`.
- `institutionType` already models `SCHOOL`, `COLLEGE`, `UNIVERSITY`, `MADRASA` —
  the data model is ready for madrasha customers today.

**Status:** ✅ Built. This is sized correctly for the target market — a single
Postgres instance with tenant-scoped rows comfortably handles many schools at
≤1,000 students each. No need to invest further here (e.g. per-tenant database
isolation, sharding) unless a customer's scale genuinely demands it later.

---

## Later (real requirements, deliberately deferred — not dropped)

- **Online Payment System** — Admission fee, monthly tuition, donations via
  bKash/Nagad/Rocket/bank transfer, receipt download. Pulled from Core per
  product decision (2026-07-06): build out the rest of the core product first,
  revisit once there's a paying pilot school ready to use it.
- **Guardian/teacher messaging** — two-way chat between guardians and
  teachers/admin. Downgraded from Core to Later; a one-way notice board is the
  Core substitute (see Guardian Portal above).
- **Madrasha-specific content** — Arabic/Hifz-track subjects, bilingual
  Bangla/Arabic UI beyond the existing `bn`/`en` i18n scaffold, Islamic calendar
  for terms/exams. Worth doing once you have a real madrasha pilot customer to
  validate the specifics with, rather than guessing upfront.
- **Advanced reports & analytics** (trend charts, predictive insights, exports)
  — basic counts/summaries are Core; anything beyond that isn't needed at this
  scale.
- **Full website CMS** (drag-and-drop page builder, custom themes) — editing
  existing sections (notices, gallery, home page text) is Core; a general
  page-builder is not needed for a single-site-per-tenant product.
