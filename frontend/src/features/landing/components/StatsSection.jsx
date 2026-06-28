import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../app/App.jsx';
import { STATS } from '../constants.js';

function AnimatedCounter({ target, started }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(id);
      } else {
        setValue(start);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, started]);

  return <span>{value.toLocaleString()}</span>;
}

export default function StatsSection() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-[var(--brand-strong)] py-16">
      <div className="landing-container">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map(({ key, value }) => (
            <div key={key} className="text-center text-white">
              <p className="text-4xl font-black sm:text-5xl">
                <AnimatedCounter target={value} started={started} />+
              </p>
              <p className="mt-2 text-sm font-semibold text-white/70">{t(`stats.${key}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
