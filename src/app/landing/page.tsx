import { redirect } from 'next/navigation'

// /about is the one marketing page
export default function LandingPage() {
  redirect('/about')
}
