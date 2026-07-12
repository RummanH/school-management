import * as greenfieldAcademy from './greenfield-academy/index.js';

// Each school/madrasah gets its own folder here (content only — same shared
// components render every site). The folder name must exactly match that
// tenant's real `slug` column value: that's the join between "which content
// to show at this path" and "which real tenant admission applications for
// this site should attribute to."
//
// To onboard a new school: copy sites/_template/ to sites/<their-slug>/,
// fill in real content, add one line below.
export const DEFAULT_SITE_SLUG = 'greenfield-academy';

export const SITES = {
  'greenfield-academy': greenfieldAcademy,
};
