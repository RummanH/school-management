import { useState } from 'react';
import { GraduationCap, CheckCircle, Copy, Check, Search, Loader2, ArrowLeft } from 'lucide-react';
import { navigate } from '../../../app/App.jsx';
import { applyForAdmission, checkAdmissionStatus } from '../../../services/api/admissionApi.js';
import { STATUS_LABELS, STATUS_COLORS } from '../constants.js';

const GENDERS = ['Male', 'Female', 'Other'];

// Client-side resize/compress before base64 encoding — keeps the payload well
// under the backend's ~1.5MB decoded cap (and the 2mb request body limit)
// without the applicant needing to know or care about file size.
function resizeImageToDataUrl(file, maxSize = 480, quality = 0.75) {
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
      img.onerror = () => reject(new Error('Could not read image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

const EMPTY = {
  applicantName: '', dateOfBirth: '', gender: '', applyingForClass: '',
  guardianName: '', guardianPhone: '', guardianEmail: '', previousSchool: '',
};

function ApplyForm({ onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const [photoData, setPhotoData] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); setError(''); }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhotoData(dataUrl);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setError(err.message || 'Could not process photo.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (photoData) payload.photoData = photoData;
      const result = await applyForAdmission(payload);
      onSubmitted(result.referenceCode);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-sm">Applicant Full Name *</label>
          <input className="input" value={form.applicantName} onChange={(e) => set('applicantName', e.target.value)}
            placeholder="e.g. Rahim Uddin" required />
        </div>
        <div>
          <label className="label-sm">Date of Birth</label>
          <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className="label-sm">Gender</label>
          <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select…</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label-sm">Applying For Class *</label>
          <input className="input" value={form.applyingForClass} onChange={(e) => set('applyingForClass', e.target.value)}
            placeholder="e.g. Class 6" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label-sm">Previous School</label>
          <input className="input" value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)}
            placeholder="Optional" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-sm">Applicant Photo</label>
          <input type="file" accept="image/*" onChange={handlePhoto}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-600 hover:file:bg-slate-200" />
          {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 h-16 w-16 rounded-lg object-cover" />}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Guardian Information</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-sm">Guardian Name *</label>
            <input className="input" value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)}
              placeholder="e.g. Karim Uddin" required />
          </div>
          <div>
            <label className="label-sm">Guardian Phone *</label>
            <input className="input" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)}
              placeholder="+880 1700-000000" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label-sm">Guardian Email</label>
            <input type="email" className="input" value={form.guardianEmail} onChange={(e) => set('guardianEmail', e.target.value)}
              placeholder="Optional" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}

function SuccessScreen({ referenceCode }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(referenceCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-black text-slate-800">Application Submitted!</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Save this reference code — you'll need it together with your guardian phone number
        to check your application status.
      </p>
      <div className="mx-auto mt-5 flex max-w-xs items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <code className="text-lg font-black tracking-widest text-slate-800">{referenceCode}</code>
        <button onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function StatusCheck() {
  const [referenceCode, setReferenceCode] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setApplication(null);
    try {
      const result = await checkAdmissionStatus(referenceCode.trim(), guardianPhone.trim());
      setApplication(result.application);
    } catch (err) {
      setError(err.message || 'No matching application found.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-sm">Reference Code *</label>
          <input className="input uppercase" value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)}
            placeholder="ADM-XXXXXX" required />
        </div>
        <div>
          <label className="label-sm">Guardian Phone *</label>
          <input className="input" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
            placeholder="+880 1700-000000" required />
        </div>
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Checking…' : 'Check Status'}
        </button>
      </form>

      {application && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-800">{application.applicantName}</p>
          <p className="text-xs text-slate-500">Applying for {application.applyingForClass}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status:</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[application.status] || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_LABELS[application.status] || application.status}
            </span>
          </div>
          {application.admissionTestDate && (
            <p className="mt-2 text-sm text-slate-600">Test scheduled: {application.admissionTestDate}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdmissionPage() {
  const initialTab = new URLSearchParams(window.location.search).get('tab') === 'status' ? 'status' : 'apply';
  const [tab, setTab] = useState(initialTab);
  const [referenceCode, setReferenceCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to website
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-800">Online Admission</h1>
            <p className="text-sm text-slate-500">Apply for admission or check your application status.</p>
          </div>
        </div>

        <div className="mb-6 flex rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => setTab('apply')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === 'apply' ? 'bg-[var(--brand)] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            New Application
          </button>
          <button onClick={() => setTab('status')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === 'status' ? 'bg-[var(--brand)] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            Check Status
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          {tab === 'apply' ? (
            referenceCode ? <SuccessScreen referenceCode={referenceCode} /> : <ApplyForm onSubmitted={setReferenceCode} />
          ) : (
            <StatusCheck />
          )}
        </div>
      </div>
    </div>
  );
}
