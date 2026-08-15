/**
 * Re-exports the canonical Supabase browser client.
 * All client-side Supabase usage should import from here or directly from @/utils/supabase/client.
 */
import { createClient } from '@/utils/supabase/client'

export const supabase = createClient()

