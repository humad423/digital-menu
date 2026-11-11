// Campaign codes and links, free of browser and network code so they can be tested.

const CODE = /^[a-z0-9-]{2,32}$/
const PATH = /^\/[A-Za-z0-9/_-]*$/

export function isCampaignCode(value: unknown): value is string {
  return typeof value === 'string' && CODE.test(value)
}

export function isCampaignPath(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 200 && PATH.test(value)
}

/** The campaign code in a page address, if it carries a valid one. */
export function readCampaignCode(search: string): string | null {
  const code = new URLSearchParams(search).get('c')?.trim().toLowerCase()
  return isCampaignCode(code) ? code : null
}

/** The address to hand out for a campaign. */
export function campaignLink(siteUrl: string, path: string, code: string): string {
  return `${siteUrl}${path}?c=${code}`
}

/** A short code nobody has to type: six letters and digits. */
export function newCampaignCode(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}
