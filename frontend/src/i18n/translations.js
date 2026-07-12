function resolvePath(source, key) {
  return key.split('.').reduce((current, part) => (current && typeof current === 'object' ? current[part] : undefined), source);
}

export function createTranslator(language, content) {
  const locale = content?.[language] ? language : 'en';
  const bundle = content?.[locale];

  return function t(key, values = {}) {
    const fallback = resolvePath(content?.en, key);
    const template = resolvePath(bundle, key) ?? fallback ?? key;

    if (typeof template !== 'string') return template;

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    });
  };
}

export const supportedLanguages = ['en', 'bn'];
