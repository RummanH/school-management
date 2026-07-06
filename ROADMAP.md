# 10-Day Build Roadmap

## How to use this document

Each day is a self-contained unit of work for an AI coding agent to pick up and
execute in order. Work through days sequentially — later days assume earlier
days are done and reuse their code. At the end of each day: run the app, verify
the "Acceptance check" for that day, update REQUIREMENTS.md status lines for
anything that moved from Pending/Partial → Done, then check the day off below.

Scope is the **Core** list from REQUIREMENTS.md, minus Online Payment,
messaging, madrasha-specific content, advanced reports, and full CMS — all of
which are explicitly in REQUIREMENTS.md's "Later" section and out of scope for
these 10 days.

**Deployment assumption for this roadmap:** building out the full app for a
single school/madrasha first (one tenant, one public website), per product
decision (2026-07-06). The multi-tenant admin/portal backend already in place
stays as-is; nothing in this roadmap needs per-tenant public-site routing
(subdomains, tenant-resolved marketing pages). New public-facing content tables
(notices, gallery, admissions) are built **without** `tenant_id`, matching the
existing `contact_messages` precedent — simplest thing that works for one
school now. Revisit this simplification if/when you move to one shared
platform serving many schools' public sites.

- [x] Day 1 — Notices & News system (backend)
- [x] Day 2 — Notices/News admin UI + Home page wiring + video gallery
- [x] Day 3 — Teacher dashboard UI, part 1 (nav, classes, routine, syllabus)
- [x] Day 4 — Teacher dashboard UI, part 2 (attendance, results, notices)
- [x] Day 5 — Student Portal completion
- [x] Day 6 — Guardian Portal completion + shared progress report
- [x] Day 7 — Online Admission (backend)
- [ ] Day 8 — Online Admission (frontend)
- [ ] Day 9 — Basic reports + About Us faculty grid
- [ ] Day 10 — End-to-end QA, bug fixes, docs

---

## Day 1 — Notices & News system (backend)

**Why first:** Home page notices/news, Guardian Portal notices, Teacher notice
publication, and Admin notice management (four separate REQUIREMENTS.md items)
all depend on one real data model. Currently notices/news on the landing page
are hardcoded translation strings (`frontend/src/features/landing/constants.js`
→ `NOTICE_SAMPLES`/`NEWS_SAMPLES`) — there's no backend at all.

**Tasks:**
1. Schema — add to `backend/db/schema.js` (Stage 1 + Stage 3 pattern, no
   `tenant_id`, matching `contact_messages`):
   ```sql
   CREATE TABLE IF NOT EXISTS notices (
     id           TEXT PRIMARY KEY,
     type         TEXT NOT NULL DEFAULT 'notice', -- 'notice' | 'news'
     title        TEXT NOT NULL,
     body         TEXT NOT NULL DEFAULT '',
     audience     TEXT NOT NULL DEFAULT 'public', -- 'public' | 'student' | 'teacher' | 'guardian' | 'all_portal'
     is_published BOOLEAN NOT NULL DEFAULT true,
     published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   -- index: idx_notices_published (is_published, published_at DESC)
   ```
2. `backend/repositories/noticeRepository.js` — `listPublicNotices(client, type, limit)`,
   `listForAudience(client, audience)` (portal feeds — should include `'all_portal'`
   plus the specific role), `listAll(client)` (admin), `insertNotice`, `updateNotice`,
   `deleteNotice`. Follow `contactRepository.js` for the "no tenant" style.
3. `backend/services/noticeService.js` — validation (`assert` pattern), plain
   CRUD wrapping the repository.
4. `backend/controllers/noticeController.js` — thin wrapper, same shape as
   `contactController.js`.
5. Routes in `backend/routes/api.js`:
   - `GET /notices/public?type=notice|news` — public, no auth (landing page).
   - `GET /notices/feed` — `auth` only, returns notices for `req.currentUser.role`.
   - `GET /admin/notices`, `POST /admin/notices`, `PUT /admin/notices/:id`,
     `DELETE /admin/notices/:id` — `staffAndAdmin` (teachers can publish too,
     per REQUIREMENTS.md Teacher Portal "Notice publication").
6. Wire `NoticeService` into `composition.js` and `app.js` like the other services.

**Acceptance check:** `GET /api/notices/public?type=notice` and `?type=news`
return `[]` on a fresh DB without error; creating a notice via a direct API call
(curl/Postman) and re-fetching shows it.

---

## Day 2 — Notices/News admin UI + Home page wiring + video gallery

**Tasks:**
1. `frontend/src/services/api/noticeApi.js` — wrappers for all Day 1 endpoints.
2. New admin page `frontend/src/features/notices/pages/NoticesPage.jsx` — list +
   create/edit/delete modal, following `UsersPage.jsx`'s table/modal pattern.
   Add "Notices" to `DashboardSidebar.jsx` (`TENANT_ADMIN_NAV`) and route it in
   `DashboardPage.jsx`.
3. Update `frontend/src/features/landing/components/NoticeSection.jsx` to fetch
   from `listPublicNotices('notice')` / `listPublicNotices('news')` instead of
   `NOTICE_SAMPLES`/`NEWS_SAMPLES`. Keep an empty-state ("No notices yet") since
   a fresh install has none.
4. Video gallery: add a `video_url` style entry to the existing gallery data
   path. Check how `GALLERY_IMAGES` / `GallerySection.jsx` currently render —
   if gallery is still static constants like notices were, give it the same
   table treatment (`gallery_items` table: id, type ['photo'|'video'], url,
   caption, sort_order) with a small admin CRUD screen; otherwise if it's
   already DB-backed, just add the `video` type and an embed renderer
   (YouTube/Vimeo iframe by URL).

**Acceptance check:** Creating a notice/news item or gallery video in the admin
panel appears on the public Home page without a code change or redeploy.

---

## Day 3 — Teacher dashboard UI, part 1 (nav, classes, routine, syllabus)

**Why this matters most:** REQUIREMENTS.md flags this as the single biggest
gap — the backend already authorizes teachers for all of this
(`staffAndAdmin` role covers `admin`, `system_developer`, and `teacher` on
every academic route in `backend/routes/api.js`), but `DashboardSidebar.jsx`
only gives teachers `SHARED_NAV` (Dashboard, Contact Messages) — there is
literally no UI entry point today.

**Tasks:**
1. `DashboardSidebar.jsx` — add a `TEACHER_NAV` (e.g. Academic only, or a
   trimmed subset) and route teachers into it instead of `SHARED_NAV` only.
2. Reuse `frontend/src/features/academic/pages/AcademicPage.jsx` and its tabs
   (`ClassesTab`, `RoutineTab`, `SyllabusTab`) for the teacher's view. Decide
   scope: does a teacher see *all* classes (simplest, matches current backend
   authorization) or only classes where they're `class_teacher_id` /
   assigned in `class_routines`? For a first pass, all classes read-only +
   edit routine/syllabus (matches existing route permissions) is the fastest
   correct option — don't build class-filtering logic unless the existing
   `ClassesTab` create/delete actions need to be hidden for teachers (they
   should be — teachers shouldn't create/delete classes, only admins).
3. Gate the Classes tab's create/delete buttons to `admin`/`system_developer`
   only inside the shared component (check `currentUser.role`), since the
   backend already restricts those actions to `adminOnly` — the UI should
   match.

**Acceptance check:** Log in as a teacher account, see "Academic" in the
sidebar, view classes/routine/syllabus; create/delete class buttons are hidden
but visible for admin.

---

## Day 4 — Teacher dashboard UI, part 2 (attendance, results, notice publication)

**Tasks:**
1. Wire `AttendanceTab` and `ResultsTab`/`ExamsTab` into the teacher's Academic
   page from Day 3 — these already call `staffAndAdmin`-gated endpoints, so
   this is UI wiring, not new backend work.
2. Add a lightweight "Publish Notice" action for teachers, using Day 1's
   `POST /admin/notices` (already allows `staffAndAdmin`) — a simple form
   (title + body + audience defaulting to `'student'` or `'all_portal'`) can
   live on the teacher's dashboard home or as a small modal from the sidebar.
3. Student evaluation: reuse the existing `remarks` field on `exam_results`
   (already exists in schema/`ResultsTab`) — don't build a separate appraisal
   feature; if remarks aren't already editable per-student in `ResultsTab`,
   add the field there.

**Acceptance check:** Log in as a teacher, mark attendance for a class, enter
exam results with remarks, publish a notice — verify the notice shows up in a
student's portal feed (once Day 5 wires that) and the public site (if
audience is `public`... note: teachers should probably be restricted from
posting `public` notices — restrict the audience dropdown to portal-only
audiences for the teacher role, reserve `public` for admin).

---

## Day 5 — Student Portal completion

**Tasks:**
1. In `frontend/src/features/portal/pages/PortalPage.jsx`, wire
   `getMyResults()` / `getMyAttendance()` (`academicApi.js` — already exist,
   unused) into the student view. Reuse the `WardResultsTable` /
   `WardAttendanceStats` components already built for Guardian Portal — extract
   them to a shared location (e.g. `frontend/src/features/portal/components/`)
   since student and guardian now render near-identical result/attendance UI.
2. Add class routine view for students: fetch the student's `classId` (already
   in their profile from `/me/profile`) and call the existing
   `getRoutine(classId)` from `academicApi.js`; render read-only (reuse
   `RoutineTab`'s display logic or a simplified table).
3. Add a notices feed to the student portal using Day 1's `GET /notices/feed`.

**Acceptance check:** Log in as a student with existing exam results and
attendance records (e.g. from Day 4 testing) — portal shows real results,
attendance summary, class routine, and any notices targeted at students.

---

## Day 6 — Guardian Portal completion + shared progress report

**Tasks:**
1. Add a notices feed to `GuardianPortal` (Day 1's `/notices/feed`, filtered to
   guardian-relevant audience).
2. Certificate/progress-report download (Student + Guardian both need this):
   build a simple printable view — a dedicated route/component showing name,
   class, roll, exam results table, attendance summary, styled for
   `window.print()` (print stylesheet hiding nav/chrome). This satisfies
   "certificate download" pragmatically without a PDF-generation dependency;
   note in REQUIREMENTS.md that it's a print-to-PDF flow, not a formal
   certificate template — upgrade later if a customer needs official-looking
   certificates.
3. Refactor: by now Student and Guardian portals share three components
   (results table, attendance stats, progress report) — confirm they're
   actually shared, not duplicated copy-paste, before moving on.

**Acceptance check:** As a guardian, see notices; as both student and guardian,
open the progress report view for a ward/self and print-preview it in the
browser (Ctrl+P) — layout should be clean without the app chrome.

---

## Day 7 — Online Admission (backend)

**Tasks:**
1. Schema — `admission_applications` table (no `tenant_id`, per this roadmap's
   single-school scope): id, applicant_name, date_of_birth, gender,
   applying_for_class, guardian_name, guardian_phone, guardian_email,
   previous_school, photo_data (base64 text, nullable), status
   (`submitted`/`under_review`/`test_scheduled`/`accepted`/`rejected`),
   admission_test_date, notes, reference_code (short unique human-readable
   code, e.g. `ADM-XXXXXX`), created_at, updated_at.
   - **Decision:** store the applicant photo as base64 text in the DB column
     rather than writing to local disk — this app deploys to Vercel (see
     `vercel.json`, `api/[...path].js`), where local filesystem writes don't
     persist between invocations. Keep uploads small (client-side resize
     before submit) since base64-in-Postgres doesn't scale to large files or
     high volume — fine for ≤1,000 students/year, revisit with real object
     storage (Supabase Storage, since Postgres is already on Supabase) if
     volume grows.
2. `backend/repositories/admissionRepository.js`, `services/admissionService.js`
   (generate `reference_code`, validate required fields), `controllers/admissionController.js`.
3. Routes:
   - `POST /admission/apply` — public, no auth.
   - `GET /admission/status?referenceCode=&guardianPhone=` — public, no auth,
     minimal lookup (matches on both fields so a stranger can't enumerate by
     reference code alone).
   - `GET /admin/admissions`, `PUT /admin/admissions/:id` (status/notes/test
     date) — `adminOnly`.
4. Wire into `composition.js`/`app.js`.

**Acceptance check:** POST an application via curl, confirm a reference code
comes back; GET status with correct reference+phone succeeds, with wrong phone
returns not-found (not the record).

---

## Day 8 — Online Admission (frontend)

**Tasks:**
1. Public admission page (new route, e.g. `/admission`) — form covering the
   fields from Day 7, client-side image resize/compress before base64 encoding
   (keep payload small), submit → show reference code prominently with "save
   this code" messaging.
2. Public status-check page/section — small form (reference code + guardian
   phone) → shows current status.
3. Link "Apply Now" from the Home page admission section
   (`AdmissionSection.jsx`) to the new public admission page.
4. Admin `AdmissionsPage.jsx` — list applications (filter by status), detail
   view, update status/notes/test date. Follow `StudentsPage.jsx`/`UsersPage.jsx`
   patterns. Add to `DashboardSidebar.jsx` tenant admin nav.

**Acceptance check:** Submit a full application from the public site, find it
in the admin Admissions list, move it through statuses, then confirm the
public status-check page reflects the update.

---

## Day 9 — Basic reports + About Us faculty grid

**Tasks:**
1. Extend `/admin/stats` (`adminController.js`/wherever stats are aggregated)
   to add: overall attendance % (from `attendance_records`), pass rate per
   recent exam (from `exam_results` vs `total_marks`/passing threshold — pick
   a simple fixed passing threshold, e.g. 33%, configurable later). Keep this
   additive to the existing stats response, not a rewrite.
2. Public "Our Faculty" section for About Us: a public endpoint
   `GET /public/faculty` returning safe fields only (name, designation,
   department, qualification — no email/phone/DOB) from `teacher_profiles`,
   and a simple grid component on the About page. No new admin UI needed —
   it's a read view of data that's already managed via the Teachers page.
3. Skip organizational structure diagram — explicitly deferred per
   REQUIREMENTS.md ("no need for an interactive org chart"); a static text
   paragraph is enough if desired, not a task item.

**Acceptance check:** Admin stats view shows attendance % and pass rate
alongside existing counts; About page shows real teacher data, not placeholder
text.

---

## Day 10 — End-to-end QA, bug fixes, docs

**Tasks:**
1. Full manual pass through every role: system_developer, admin, teacher,
   student, guardian — for each, walk the primary flows touched this week
   (notices, teacher dashboard, student/guardian portals, admissions, reports).
2. Fix whatever breaks. Prioritize correctness bugs over polish.
3. Update REQUIREMENTS.md status lines for every module touched this week —
   flip ❌/⚙️ to ✅ where genuinely complete, and be honest about what's still
   partial (e.g. if teacher class-filtering was skipped on Day 3, note it).
4. Update this ROADMAP.md — check off all ten days, and add a short "Known
   gaps / next roadmap" note for anything discovered but out of scope (e.g.
   real object storage for admission photos, per-tenant public sites,
   payment integration, messaging).

**Acceptance check:** A fresh person could log in as each of the five roles
and use every Core feature in REQUIREMENTS.md without hitting a dead end or
error.
