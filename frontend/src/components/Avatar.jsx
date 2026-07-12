import { useState } from 'react';

function initials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

// Shows a real photo when one is set (and actually loads); falls back to
// initials otherwise. `icon` overrides both (used for e.g. group-chat
// avatars, which have no single person's photo to show).
export default function Avatar({
  name,
  photoUrl,
  icon: Icon,
  size = 'h-10 w-10',
  textSize = 'text-sm',
  tone = 'bg-slate-900 text-white',
  rounded = 'rounded-full',
  className = '',
  children,
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = !Icon && photoUrl && !broken;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center font-black ${size} ${rounded} ${className} ${showPhoto ? '' : `${tone} ${textSize}`}`}
    >
      <div className={`flex h-full w-full items-center justify-center overflow-hidden ${rounded}`}>
        {Icon ? (
          <Icon className="h-1/2 w-1/2" />
        ) : showPhoto ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        ) : (
          initials(name)
        )}
      </div>
      {children}
    </div>
  );
}
