// ছোট রাউটার — কোনো লাইব্রেরি ছাড়া, History API দিয়ে।
// Netlify-র SPA fallback (netlify.toml) সব পথ /index.html-এ পাঠায়।

import { useEffect, useState } from 'react'

export function getPath(): string {
  return window.location.pathname
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

export function usePath(): string {
  const [path, setPath] = useState(getPath())
  useEffect(() => {
    const onChange = () => setPath(getPath())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}

export function pathSegments(path: string): string[] {
  return path.split('/').filter((part) => part.length > 0)
}
