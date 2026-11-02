import 'server-only'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

/**
 * Verifies a Firebase ID token against Google's public keys and returns the phone
 * number Firebase confirmed by SMS. Throws if the token is invalid or has no phone.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; phone: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set')

  const { payload } = await jwtVerify(idToken, firebaseKeys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  })

  const phone = payload.phone_number
  if (!payload.sub || typeof phone !== 'string' || !phone) {
    throw new Error('Token has no verified phone number')
  }

  return { uid: payload.sub, phone }
}
