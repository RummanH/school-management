import en from './locales/en.js';
import bn from './locales/bn.js';

const translations = { en, bn };

function resolvePath(source, key) {
  return key.split('.').reduce((current, part) => (current && typeof current === 'object' ? current[part] : undefined), source);
}

export function createTranslator(language) {
  const locale = translations[language] ? language : 'en';
  const bundle = translations[locale];

  return function t(key, values = {}) {
    const fallback = resolvePath(translations.en, key);
    const template = resolvePath(bundle, key) ?? fallback ?? key;

    if (typeof template !== 'string') return template;

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    });
  };
}

export const supportedLanguages = ['en', 'bn'];
