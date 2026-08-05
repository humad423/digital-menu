import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDR01WLxKT0jIWnYbsr93In9hnnVlTj9tM",
  authDomain: "order-ccbae.firebaseapp.com",
  projectId: "order-ccbae",
  storageBucket: "order-ccbae.firebasestorage.app",
  messagingSenderId: "342137080210",
  appId: "1:342137080210:web:8f13bd7184932ca23f194b",
  measurementId: "G-NN5TGHTX31"
};

// Initialize Firebase app if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

export { RecaptchaVerifier, signInWithPhoneNumber }
