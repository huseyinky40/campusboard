const SUPPORTED_UNIVERSITIES = [
  {
    slug: 'istanbul-arel-university',
    name: 'İstanbul Arel Üniversitesi',
    shortName: 'İstanbul Arel',
    domain: 'istanbularel.edu.tr',
    logo: '/assets/istanbul_arel_university_logo_black.svg',
  },
];

function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase().replace(/^@/, '');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function findUniversityByEmail(email) {
  const normalized = normalizeEmail(email);
  return SUPPORTED_UNIVERSITIES.find(university =>
    normalized.endsWith(`@${normalizeDomain(university.domain)}`)
  ) || null;
}

function findUniversityBySlug(slug) {
  return SUPPORTED_UNIVERSITIES.find(university => university.slug === slug) || null;
}

function defaultUniversity() {
  return SUPPORTED_UNIVERSITIES[0];
}

function publicUniversity(university) {
  if (!university) return null;
  return {
    slug: university.slug,
    name: university.name,
    shortName: university.shortName,
    domain: university.domain,
    logo: university.logo,
  };
}

function supportedDomainText() {
  return SUPPORTED_UNIVERSITIES.map(university => `@${university.domain}`).join(', ');
}

module.exports = {
  SUPPORTED_UNIVERSITIES,
  normalizeEmail,
  findUniversityByEmail,
  findUniversityBySlug,
  defaultUniversity,
  publicUniversity,
  supportedDomainText,
};
