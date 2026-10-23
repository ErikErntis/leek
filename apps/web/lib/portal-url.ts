export function portalUrl(path: '/' | '/profiil' | '/pakett' | '/tookuulutused') { return path === '/' ? '/portaal' : `/portaal${path}`; }
