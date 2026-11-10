// How a visit began, remembered for the rest of it: a store's QR code, a link to one store, or the site itself.
// Free of React so it can be tested.

export type Entry = 'qr' | 'store' | 'site'

const KEY = 'alfsouq_entry'

/** Where a visit that lands on this address began. */
export function entryFor(pathname: string, search: string): Entry {
  const params = new URLSearchParams(search)
  const source = params.get('source') || params.get('src')
  if (source === 'qr') return 'qr'
  return pathname.startsWith('/m/') ? 'store' : 'site'
}

let remembered: Entry | null = null

/**
 * How this visit began. Worked out on the first page and kept for the visit, so moving on
 * to another page doesn't change it. A QR code scanned later in the same visit still counts.
 */
export function visitEntry(): Entry {
  if (typeof window === 'undefined') return 'site'
  const here = entryFor(window.location.pathname, window.location.search)
  if (!remembered) {
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved === 'qr' || saved === 'store' || saved === 'site') remembered = saved
    } catch {}
  }
  if (!remembered || (here === 'qr' && remembered !== 'qr')) {
    remembered = remembered && here !== 'qr' ? remembered : here
    try {
      sessionStorage.setItem(KEY, remembered)
    } catch {}
  }
  return remembered
}
