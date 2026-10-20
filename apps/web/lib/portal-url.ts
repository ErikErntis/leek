/** Fixed application-owned destinations, never a user-supplied redirect target. */
export function portalUrl(path: '/' | '/profiil' | '/pakett' | '/tookuulutused') {
  return new URL(path, process.env.PORTAL_URL || 'http://localhost:3001').toString();
}
