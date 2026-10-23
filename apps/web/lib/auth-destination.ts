/** Only local portal routes can be used as post-login destinations. */
export function authDestination(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1000 || /[\\\u0000-\u0020\u007f]/.test(value)) return '/portaal';
  try {
    const url = new URL(value, 'https://leek.invalid');
    if (!value.startsWith('/') || url.origin !== 'https://leek.invalid') return '/portaal';
    if (url.pathname !== '/portaal' && !url.pathname.startsWith('/portaal/')) return '/portaal';
    return url.pathname + url.search;
  } catch { return '/portaal'; }
}
