import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpenCheck, Building2, Eye, GraduationCap, Landmark, Target, UserRound } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { listPublicTeachers } from '../../../services/api/teacherApi.js';
import { ACCENT_COLORS } from '../constants.js';

const FALLBACK_FACULTY = [
  {
    userId: 'public-teacher-1',
    name: 'Dr. Mahbub Islam',
    designation: 'Head Teacher',
    department: 'Science',
    qualification: 'M.Sc, B.Ed',
    photoUrl: '/images/faculty/1-head-teacher.jpg',
  },
  {
    userId: 'public-teacher-2',
    name: 'Nusrat Jahan',
    designation: 'Senior Teacher',
    department: 'Mathematics',
    qualification: 'M.Sc, M.Ed',
    photoUrl: '/images/faculty/2-senior-teacher.jpg',
  },
  {
    userId: 'public-teacher-3',
    name: 'Rashed Karim',
    designation: 'Assistant Teacher',
    department: 'Languages',
    qualification: 'M.A, B.Ed',
    photoUrl: '/images/faculty/3-assistant-teacher.jpg',
  },
  {
    userId: 'public-teacher-4',
    name: 'Sabina Akter',
    designation: 'ICT Teacher',
    department: 'ICT',
    qualification: 'B.Sc in CSE',
    photoUrl: '/images/faculty/4-ict-teacher.jpg',
  },
];

const HISTORY = [
  { year: '1998', title: 'Foundation', text: 'Greenfield Academy began with a small group of learners and a commitment to disciplined, caring education.' },
  { year: '2008', title: 'Academic Expansion', text: 'The institution expanded its secondary programs, laboratories, library, and co-curricular activities.' },
  { year: '2018', title: 'Digital Campus', text: 'Classrooms, administration, attendance, results, and guardian communication moved into a modern digital workflow.' },
  { year: 'Today', title: 'Future-ready Learning', text: 'The school continues to combine strong academics with values, leadership, and practical skills.' },
];

const LEADERSHIP = [
  { role: 'Governing Body', name: 'Strategic direction and institutional policy' },
  { role: 'Chairman', name: 'Mr. Abdullah Al Mamun' },
  { role: 'Principal', name: 'Mrs. Fatema Begum' },
  { role: 'Academic Coordinators', name: 'Section planning, routines, exams, and teacher support' },
  { role: 'Class Teachers', name: 'Student care, attendance, guardians, and daily classroom guidance' },
];

const PHOTO_FALLBACKS = [
  '/images/faculty/1-head-teacher.jpg',
  '/images/faculty/2-senior-teacher.jpg',
  '/images/faculty/3-assistant-teacher.jpg',
  '/images/faculty/4-ict-teacher.jpg',
];

function FacultyCard({ teacher, index }) {
  const photo = teacher.photoUrl || PHOTO_FALLBACKS[index % PHOTO_FALLBACKS.length];
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
      <div className="aspect-square bg-slate-100">
        <img src={photo} alt={teacher.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-5">
        <p className="text-base font-black text-[var(--brand-strong)]">{teacher.name}</p>
        <p className="mt-1 text-sm font-bold text-[var(--brand)]">{teacher.designation || 'Faculty Member'}</p>
        <div className="mt-4 space-y-2 text-sm text-[var(--text-soft)]">
          <p><span className="font-bold text-slate-500">Department:</span> {teacher.department || 'General'}</p>
          <p><span className="font-bold text-slate-500">Qualification:</span> {teacher.qualification || 'Experienced educator'}</p>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ icon: Icon, title, children, colorIndex = 0 }) {
  const color = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length];
  return (
    <div className="card flex gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color.bg} ${color.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-lg font-bold text-[var(--brand-strong)]">{title}</h3>
        <div className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">{children}</div>
      </div>
    </div>
  );
}

export default function AboutSection() {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    listPublicTeachers()
      .then((data) => setTeachers(data.teachers || []))
      .catch(() => setTeachers([]));
  }, []);

  const faculty = useMemo(() => (teachers.length ? teachers : FALLBACK_FACULTY).slice(0, 8), [teachers]);

  return (
    <section id="about" className="dot-pattern bg-white py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('about.title')}</h2>
          <p className="section-subtitle mx-auto max-w-2xl">{t('about.subtitle')}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <InfoCard icon={Eye} title={t('about.vision')} colorIndex={0}>{t('about.visionText')}</InfoCard>
          <InfoCard icon={Target} title={t('about.mission')} colorIndex={1}>{t('about.missionText')}</InfoCard>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">Institution History</p>
                <h3 className="text-xl font-black text-[var(--brand-strong)]">Built on service, discipline, and academic care</h3>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {HISTORY.map((item) => (
                <div key={item.year} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{item.year}</p>
                  <p className="mt-2 font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">Founder Profile</p>
                <h3 className="text-xl font-black text-[var(--brand-strong)]">Late M. A. Rahman</h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[var(--text-soft)]">
              The founder envisioned a school where children from every background could receive dependable teaching, moral guidance, and access to modern learning resources. His founding principles continue to guide classroom culture, student care, and community service.
            </p>
            <div className="mt-5 rounded-2xl bg-[var(--brand-soft)] p-4 text-sm font-semibold text-[var(--brand-strong)]">
              Founder motto: knowledge with character, service with humility.
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            { titleKey: 'chairmanTitle', nameKey: 'chairmanName', msgKey: 'chairmanMessage', initial: 'C' },
            { titleKey: 'principalTitle', nameKey: 'principalName', msgKey: 'principalMessage', initial: 'P' },
          ].map(({ titleKey, nameKey, msgKey, initial }) => (
            <div key={titleKey} className="card">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--brand)]">{t(`about.${titleKey}`)}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-black text-white">
                  {initial}
                </span>
                <p className="text-sm font-bold text-[var(--brand-strong)]">{t(`about.${nameKey}`)}</p>
              </div>
              <blockquote className="mt-4 border-l-4 border-emerald-200 pl-4 text-sm italic leading-relaxed text-[var(--text-soft)]">
                "{t(`about.${msgKey}`)}"
              </blockquote>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="brand-chip"><GraduationCap className="h-3.5 w-3.5" /> Faculty & Staff</p>
              <h3 className="mt-3 text-2xl font-black text-[var(--brand-strong)]">Meet Our Faculty</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-soft)]">
                Qualified teachers lead academic programs, classroom mentoring, discipline, and student support across every section.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.map((teacher, index) => <FacultyCard key={teacher.userId || teacher.id || teacher.name} teacher={teacher} index={index} />)}
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <InfoCard icon={Building2} title="Organizational Structure" colorIndex={2}>
            A clear leadership structure keeps academics, student welfare, admissions, discipline, and guardian communication accountable.
          </InfoCard>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {LEADERSHIP.map((item, index) => (
                <div key={item.role} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--brand)] shadow-sm">
                    {index === 0 ? <Award className="h-4 w-4" /> : index === 2 ? <BookOpenCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                  </span>
                  <p className="mt-3 text-sm font-black text-slate-800">{item.role}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
