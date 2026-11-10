// The public half of the key that signs offer notifications. Browsers need it to subscribe; it is safe to publish.
// The private half is VAPID_PRIVATE_KEY, set only on the server.
export const VAPID_PUBLIC_KEY = 'BGAcPIksWsTMIRql-BZsHlNY2SL7kv3N-P25APzdpXviRtv0F424Ha-HNhDf4jOkjkNKcI8g0fv18EVrxejzbj8'

// Who sends the notifications, as push services ask for a way to reach the sender
export const VAPID_SUBJECT = 'https://alfsouq.com'
