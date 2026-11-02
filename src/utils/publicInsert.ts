/**
 * Adds a public row (a visit or an order record) without loading the Supabase library,
 * which customers on slow connections shouldn't have to download for this.
 * keepalive lets the request finish even when the page is leaving for WhatsApp.
 */
export async function publicInsert(table: 'orders' | 'qr_scans', row: Record<string, unknown>): Promise<void> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!response.ok) throw new Error(`Could not save to ${table}: ${response.status}`)
}
