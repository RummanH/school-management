import { useState } from 'react';
import { MapPin, Phone, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../app/App.jsx';
import { submitContact } from '../../../services/api/contactApi.js';
import { ACCENT_COLORS } from '../constants.js';

export default function ContactSection() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle');

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await submitContact(form);
      setStatus('success');
      setForm({ name: '', phone: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="bg-slate-50 py-20">
      <div className="landing-container">
        <div className="text-center">
          <h2 className="section-title">{t('contact.title')}</h2>
          <p className="section-subtitle">{t('contact.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="card space-y-4">
              {[
                { icon: MapPin, value: t('contact.address') },
                { icon: Phone, value: t('contact.phone') },
                { icon: Mail, value: t('contact.email') },
              ].map(({ icon: Icon, value }, i) => {
                const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
                return (
                  <div key={value} className="flex items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-relaxed text-slate-700">{value}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl bg-slate-200" style={{ height: '220px' }}>
              <iframe
                title={t('contact.mapTitle')}
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.9027254474817!2d90.39928571489073!3d23.750828084589136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDQ1JzAzLjAiTiA5MMKwMjMnNTkuNiJF!5e0!3m2!1sen!2sbd!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-[var(--brand-strong)]">{t('contact.form.title')}</h3>

            {status === 'success' && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {t('contact.form.success')}
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                {t('contact.form.error')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">{t('contact.form.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t('contact.form.namePlaceholder')}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-[var(--brand)] transition focus:border-[var(--brand)] focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">{t('contact.form.phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder={t('contact.form.phonePlaceholder')}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-[var(--brand)] transition focus:border-[var(--brand)] focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">{t('contact.form.message')}</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder={t('contact.form.messagePlaceholder')}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-[var(--brand)] transition focus:border-[var(--brand)] focus:ring-2"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-cta w-full justify-center disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {status === 'loading' ? t('contact.form.submitting') : t('contact.form.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
