// ছোট রাউটার — কোনো লাইব্রেরি ছাড়া, History API দিয়ে।
// Netlify-র SPA fallback (netlify.toml) সব পথ /index.html-এ পাঠায়।

import { useEffect, useState } from 'react'

export function getPath(): string {
  return window.location.pathname
}

// কোয়েরি স্ট্রিং (?status=new, ?q=...) — পথের সঙ্গে মেশানো হয় না,
// যাতে App.tsx-র pathSegments রাউটিং না ভাঙে। পেজগুলো useSearch()
// দিয়ে ছাঁকনি পড়ে (ড্যাশবোর্ডের স্ট্যাট কার্ড, ওপরের খোঁজা)।
export function getSearch(): string {
  return window.location.search
}

export function useSearch(): string {
  const [search, setSearch] = useState(getSearch())
  useEffect(() => {
    const onChange = () => setSearch(getSearch())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return search
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
