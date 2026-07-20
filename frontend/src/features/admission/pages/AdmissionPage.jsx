import { useState, useEffect } from 'react';
import {
  GraduationCap, CheckCircle, Copy, Check, Search, Loader2, ArrowLeft,
  UserRound, Users, FileText, Camera, CalendarClock, Sparkles,
} from 'lucide-react';
import { navigate, useLanguage } from '../../../app/App.jsx';
import { applyForAdmission, checkAdmissionStatus } from '../../../services/api/admissionApi.js';
import { listClassesPublic } from '../../../services/api/academicApi.js';
import { STATUS_COLORS } from '../constants.js';

const DOCUMENT_TYPES = [
  { key: 'birth_certificate', labelKey: 'birthCertificate' },
  { key: 'previous_school_certificate', labelKey: 'previousSchoolCertificate' },
  { key: 'transfer_certificate', labelKey: 'transferCertificate' },
  { key: 'guardian_identity', labelKey: 'guardianIdentity' },
];

function fileToDataUrl(file, t) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(t('admission.page.readDocumentError')));
    reader.readAsDataURL(file);
  });
}

function resizeImageToDataUrl(file, t, maxSize = 480, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error(t('admission.page.readImageError')));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(t('admission.page.readImageError')));
    reader.readAsDataURL(file);
  });
}

const EMPTY = {
  applicantName: '', dateOfBirth: '', gender: '', applyingForClass: '',
  guardianName: '', guardianPhone: '', guardianEmail: '', previousSchool: '',
};

function FieldGroupTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-black text-[var(--brand-strong)]">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function ApplyForm({ onSubmitted, t, schoolSlug }) {
  const genders = [
    { value: 'Male', label: t('admission.page.genderMale') },
    { value: 'Female', label: t('admission.page.genderFemale') },
    { value: 'Other', label: t('admission.page.genderOther') },
  ];

  const [form, setForm] = useState(EMPTY);
  const [photoData, setPhotoData] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [documents, setDocuments] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    listClassesPublic(schoolSlug)
      .then((d) => setClasses(d.classes || []))
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, [schoolSlug]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); setError(''); }

  async function handleDocument(type, file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(t('admission.page.documentTooLarge')); return; }
    try {
      const data = await fileToDataUrl(file, t);
      setDocuments((current) => ({ ...current, [type]: { documentType: type, name: file.name, data } }));
    } catch (err) { setError(err.message || t('admission.page.processDocumentError')); }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, t);
      setPhotoData(dataUrl);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setError(err.message || t('admission.page.processPhotoError'));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (photoData) payload.photoData = photoData;
      if (schoolSlug) payload.schoolSlug = schoolSlug;
      payload.documents = Object.values(documents);
      const result = await applyForAdmission(payload);
      onSubmitted(result.referenceCode);
    } catch (err) {
      setError(err.message || t('admission.page.submitError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        <FieldGroupTitle icon={UserRound} title={t('admission.page.applicantDetails')} subtitle={t('admission.page.applicantSubtitle')} />
        <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-sm">{t('admission.page.applicantName')}</label>
            <input className="input" value={form.applicantName} onChange={(e) => set('applicantName', e.target.value)}
              placeholder={t('admission.page.applicantNamePlaceholder')} required />
          </div>
          <div>
            <label className="label-sm">{t('admission.page.dateOfBirth')}</label>
            <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </div>
          <div>
            <label className="label-sm">{t('admission.page.gender')}</label>
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">{t('admission.page.selectOption')}</option>
              {genders.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">{t('admission.page.applyingForClass')}</label>
            {classesLoading ? (
              <div className="input flex items-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : classes.length > 0 ? (
              <select className="input" value={form.applyingForClass} onChange={(e) => set('applyingForClass', e.target.value)} required>
                <option value="">{t('admission.page.selectClass')}</option>
                {classes.map((c) => {
                  const label = c.section ? `${c.name} - ${c.section}` : c.name;
                  return <option key={c.id} value={label}>{label}</option>;
                })}
              </select>
            ) : (
              <input className="input" value={form.applyingForClass} onChange={(e) => set('applyingForClass', e.target.value)}
                placeholder="e.g. Class 6" required />
            )}
          </div>
          <div>
            <label className="label-sm">{t('admission.page.previousSchool')}</label>
            <input className="input" value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)}
              placeholder={t('admission.page.optional')} />
          </div>

          <div className="sm:col-span-2 flex items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-soft)]">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-[var(--brand)]" />
              )}
            </div>
            <div className="flex-1">
              <label className="label-sm">{t('admission.page.applicantPhoto')}</label>
              <input type="file" accept="image/*" onChange={handlePhoto}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--brand-strong)] hover:file:brightness-95" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <FieldGroupTitle icon={FileText} title={t('admission.page.supportingDocuments')} subtitle={t('admission.page.supportingDocumentsSubtitle')} />
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((doc) => {
            const uploaded = documents[doc.key];
            return (
              <label key={doc.key} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                uploaded ? 'border-emerald-200 bg-emerald-50/60' : 'border-dashed border-slate-200 bg-slate-50/60 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]'
              }`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 group-hover:text-[var(--brand)]'
                }`}>
                  {uploaded ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-700">{t(`admission.page.${doc.labelKey}`)}</span>
                  <span className={`block truncate text-xs ${uploaded ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {uploaded ? uploaded.name : t('admission.page.uploadPrompt')}
                  </span>
                </div>
                <input type="file" accept="application/pdf,image/*" onChange={(e) => handleDocument(doc.key, e.target.files?.[0])} className="hidden" />
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <FieldGroupTitle icon={Users} title={t('admission.page.guardianInfo')} subtitle={t('admission.page.guardianSubtitle')} />
        <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2">
          <div>
            <label className="label-sm">{t('admission.page.guardianName')}</label>
            <input className="input" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)}
              placeholder={t('admission.page.guardianNamePlaceholder')} required />
          </div>
          <div>
            <label className="label-sm">{t('admission.page.guardianPhone')}</label>
            <input className="input" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)}
              placeholder={t('admission.page.guardianPhonePlaceholder')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label-sm">{t('admission.page.guardianEmail')}</label>
            <input type="email" className="input" value={form.guardianEmail} onChange={(e) => set('guardianEmail', e.target.value)}
              placeholder={t('admission.page.optional')} />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3.5 text-base">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {saving ? t('admission.page.submitting') : t('admission.page.submitApplication')}
      </button>
    </form>
  );
}

function SuccessScreen({ referenceCode, t }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(referenceCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-[var(--brand)] shadow-[0_16px_36px_rgba(26,107,60,0.3)]">
        <CheckCircle className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-xl font-black text-[var(--brand-strong)]">{t('admission.page.submittedTitle')}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {t('admission.page.submittedText')}
      </p>
      <div className="mx-auto mt-6 flex max-w-xs items-center justify-between gap-3 rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand-soft)] px-5 py-4">
        <code className="text-xl font-black tracking-widest text-[var(--brand-strong)]">{referenceCode}</code>
        <button onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--brand)]/20 bg-white px-3 py-1.5 text-xs font-bold text-[var(--brand-strong)] transition hover:bg-[var(--brand-soft)]">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t('admission.page.copied') : t('admission.page.copy')}
        </button>
      </div>
    </div>
  );
}

function StatusCheck({ t }) {
  const [referenceCode, setReferenceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);

  const statusLabels = {
    submitted: t('admission.page.statusSubmitted'),
    under_review: t('admission.page.statusUnderReview'),
    test_scheduled: t('admission.page.statusTestScheduled'),
    accepted: t('admission.page.statusAccepted'),
    rejected: t('admission.page.statusRejected'),
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setApplication(null);
    try {
      const result = await checkAdmissionStatus(referenceCode.trim());
      setApplication(result.application);
    } catch (err) {
      setError(err.message || t('admission.page.noMatch'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-sm">{t('admission.page.referenceCode')}</label>
          <input className="input uppercase tracking-widest" value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)}
            placeholder={t('admission.page.referencePlaceholder')} required />
        </div>
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 text-base">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? t('admission.page.checking') : t('admission.checkStatus')}
        </button>
      </form>

      {application && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--brand-strong)]">{application.applicantName}</p>
              <p className="text-xs text-slate-400">{t('admission.page.statusFor', { className: application.applyingForClass })}</p>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('admission.page.statusLabel')}</span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_COLORS[application.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusLabels[application.status] || application.status}
              </span>
            </div>
            {application.admissionTestDate && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <CalendarClock className="h-4 w-4 shrink-0 text-amber-500" />
                {t('admission.page.testScheduled', { date: application.admissionTestDate })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdmissionPage() {
  const { t, siteSlug } = useLanguage();
  const query = new URLSearchParams(window.location.search);
  const initialTab = query.get('tab') === 'status' ? 'status' : 'apply';
  // /admission is a "reserved route" (see App.jsx), so it always renders the
  // default site's branding even without a ?school= param — schoolSlug must
  // fall back to that same site so a submitted application always attributes
  // to the school the page visually claims to be, instead of going nowhere.
  const schoolSlug = query.get('school') || siteSlug || '';
  const [tab, setTab] = useState(initialTab);
  const [referenceCode, setReferenceCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden bg-[var(--brand-strong)] pb-20 pt-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4">
          <button onClick={() => navigate(schoolSlug ? `/${schoolSlug}` : '/')}
            className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('admission.page.back')}
          </button>

          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7 text-white" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/50">{t('admission.page.eyebrow')}</p>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{t('admission.page.title')}</h1>
            </div>
          </div>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
            {t('admission.page.subtitle')}
          </p>
        </div>
      </div>

      <div className="relative mx-auto -mt-12 max-w-2xl px-4 pb-16">
        <div className="mb-6 flex rounded-2xl border border-slate-100 bg-white p-1.5 shadow-soft">
          <button onClick={() => setTab('apply')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${tab === 'apply' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {t('admission.page.newApplication')}
          </button>
          <button onClick={() => setTab('status')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${tab === 'status' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {t('admission.page.statusTab')}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft sm:p-8">
          {tab === 'apply' ? (
            referenceCode ? <SuccessScreen referenceCode={referenceCode} t={t} /> : <ApplyForm onSubmitted={setReferenceCode} t={t} schoolSlug={schoolSlug} />
          ) : (
            <StatusCheck t={t} />
          )}
        </div>
      </div>
    </div>
  );
}
