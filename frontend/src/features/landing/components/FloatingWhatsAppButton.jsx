import { useLanguage } from '../../../app/App.jsx';
import { SCHOOL_WHATSAPP } from '../constants.js';

const LABEL = { en: 'Chat on WhatsApp', bn: 'হোয়াটসঅ্যাপে চ্যাট করুন' };
const PREFILL = {
  en: "Hello Greenfield Academy, I'd like to know more about the school management platform.",
  bn: 'হ্যালো গ্রিনফিল্ড একাডেমি, আমি স্কুল ম্যানেজমেন্ট প্ল্যাটফর্ম সম্পর্কে আরও জানতে চাই।',
};

export default function FloatingWhatsAppButton() {
  const { language } = useLanguage();
  const label = LABEL[language] || LABEL.en;
  const text = PREFILL[language] || PREFILL.en;
  const href = `https://wa.me/${SCHOOL_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6"
    >
      <span className="pointer-events-none max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white opacity-0 shadow-lg transition-all duration-300 group-hover:max-w-xs group-hover:px-4 group-hover:opacity-100">
        {label}
      </span>
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-900/30 transition-transform duration-200 hover:scale-105 active:scale-95">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-60" style={{ animationDuration: '2.4s' }} />
        <svg viewBox="0 0 32 32" className="relative h-7 w-7" fill="currentColor" aria-hidden="true">
          <path d="M16.001 2.667c-7.363 0-13.334 5.97-13.334 13.333 0 2.353.615 4.66 1.782 6.687L2.667 29.333l6.79-1.78a13.27 13.27 0 0 0 6.544 1.714h.006c7.362 0 13.333-5.97 13.333-13.333 0-3.562-1.387-6.912-3.906-9.43a13.246 13.246 0 0 0-9.433-3.837Zm0 24.4h-.005a11.06 11.06 0 0 1-5.634-1.542l-.404-.24-4.03 1.057 1.076-3.928-.263-.403a11.04 11.04 0 0 1-1.69-5.878c0-6.106 4.97-11.075 11.078-11.075 2.958 0 5.738 1.153 7.83 3.246a10.998 10.998 0 0 1 3.242 7.834c0 6.107-4.97 11.076-11.075 11.076Zm6.075-8.294c-.333-.167-1.97-.972-2.275-1.083-.305-.111-.527-.166-.75.167-.222.333-.86 1.083-1.055 1.305-.194.222-.388.25-.722.083-.333-.167-1.407-.519-2.68-1.653-.99-.883-1.66-1.974-1.854-2.307-.194-.333-.021-.514.146-.68.15-.15.333-.389.5-.583.166-.194.222-.333.333-.556.111-.222.056-.417-.028-.583-.083-.167-.75-1.807-1.028-2.474-.271-.65-.546-.562-.75-.573-.194-.01-.417-.012-.639-.012-.222 0-.583.083-.889.417-.305.333-1.166 1.14-1.166 2.78 0 1.64 1.194 3.226 1.361 3.448.167.222 2.35 3.589 5.694 5.033.795.343 1.415.548 1.898.702.797.254 1.522.218 2.096.132.639-.095 1.97-.805 2.248-1.583.278-.778.278-1.444.194-1.583-.083-.14-.305-.222-.638-.389Z" />
        </svg>
      </span>
    </a>
  );
}
