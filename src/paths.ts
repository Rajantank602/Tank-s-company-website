const BASE = import.meta.env.BASE_URL;

export function pagePath(path = '') {
  const normalized = path.replace(/^\/+/, '');
  return `${BASE}${normalized}`;
}

export function homeHash(hash: string) {
  return `${BASE}#${hash.replace(/^#/, '')}`;
}

export function currentPage(): 'home' | 'tiny' | 'terrain' {
  const base = BASE.replace(/\/+$/, '');
  let pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    pathname = pathname.slice(base.length) || '/';
  }
  if (pathname === '/tiny') return 'tiny';
  if (pathname === '/terrain') return 'terrain';
  return 'home';
}
