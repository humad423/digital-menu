import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDR01WLxKT0jIWnYbsr93In9hnnVlTj9tM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "order-ccbae.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "order-ccbae",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "order-ccbae.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "342137080210",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:342137080210:web:8f13bd7184932ca23f194b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-NN5TGHTX31"
}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
auth.languageCode = 'ar' // Arabic Language for SMS

export { app, auth, RecaptchaVerifier, signInWithPhoneNumber }
export type { ConfirmationResult }
