// Moves base64 images stored in the database to Cloudinary and removes image data
// from saved orders. A row is only updated after its upload has succeeded, so it is
// safe to run again after a failure.
//
//   node --env-file=.env.local scripts/maintenance/migrate-images-to-cloudinary.mjs
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const uploaded = new Map()
const stats = { uploaded: 0, reused: 0, rows: 0, failed: 0 }

const isBase64 = value => typeof value === 'string' && value.startsWith('data:image')

async function toCloudinary(dataUrl, folder) {
  const key = createHash('sha256').update(dataUrl).digest('hex')
  if (uploaded.has(key)) {
    stats.reused++
    return uploaded.get(key)
  }

  const form = new FormData()
  form.append('file', dataUrl)
  form.append('upload_preset', uploadPreset)
  form.append('folder', `alfsouq/${folder}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form })
  const json = await res.json()
  if (!json.secure_url) throw new Error(json.error?.message || `Upload failed with status ${res.status}`)

  uploaded.set(key, json.secure_url)
  stats.uploaded++
  return json.secure_url
}

async function migrateTable(table, stringColumns, arrayColumns, folder) {
  const { data: rows, error } = await supabase.from(table).select(['id', ...stringColumns, ...arrayColumns].join(','))
  if (error) throw error

  for (const row of rows) {
    const update = {}
    try {
      for (const column of stringColumns) {
        if (isBase64(row[column])) update[column] = await toCloudinary(row[column], folder)
      }
      for (const column of arrayColumns) {
        const list = Array.isArray(row[column]) ? row[column] : []
        if (list.some(isBase64)) {
          update[column] = await Promise.all(list.map(v => (isBase64(v) ? toCloudinary(v, folder) : v)))
        }
      }
    } catch (err) {
      stats.failed++
      console.error(`${table} ${row.id}: ${err.message}`)
      continue
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase.from(table).update(update).eq('id', row.id)
      if (updateError) {
        stats.failed++
        console.error(`${table} ${row.id}: ${updateError.message}`)
      } else {
        stats.rows++
      }
    }
  }
}

async function slimOrders() {
  const { data: orders, error } = await supabase.from('orders').select('id, items')
  if (error) throw error

  let slimmed = 0
  for (const order of orders) {
    const items = (Array.isArray(order.items) ? order.items : []).map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))
    const { error: updateError } = await supabase.from('orders').update({ items }).eq('id', order.id)
    if (updateError) console.error(`orders ${order.id}: ${updateError.message}`)
    else slimmed++
  }
  return slimmed
}

await migrateTable('restaurants', ['logo_url', 'cover_url'], [], 'stores')
await migrateTable('menu_items', ['image_url'], ['images'], 'items')
await migrateTable('offers', ['image_url'], ['images'], 'offers')
await migrateTable('platform_ads', ['image_url'], [], 'ads')

// Item galleries reference the same image, so point the leftover cover at the new URL
console.log('images', stats)

if (stats.failed === 0) {
  console.log('orders slimmed', await slimOrders())
} else {
  console.log('orders skipped because some uploads failed')
}
