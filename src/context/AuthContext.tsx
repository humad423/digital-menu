'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User } from '@supabase/supabase-js'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  phone: string
  full_name: string | null
  role: 'customer' | 'restaurant_owner' | 'admin'
  restaurant_id: string | null
  created_at?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isLoggedIn: boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  completePhoneLogin: (firebaseUser: FirebaseUser) => Promise<{ restaurantId: string | null }>
  openAuthModal: (onSuccessCallback?: () => void) => void
  closeAuthModal: () => void
  isAuthModalOpen: boolean
  onSuccessCallback: (() => void) | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isLoggedIn: false,
  logout: async () => {},
  refreshProfile: async () => {},
  completePhoneLogin: async () => ({ restaurantId: null }),
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
  onSuccessCallback: null
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null)

  const syncFromUser = useCallback(async (nextUser: User | null) => {
    // Only phone logins are customers/owners here; the admin's email login has no phone
    const phone = nextUser?.app_metadata?.phone as string | undefined
    if (!nextUser || !phone) {
      setUser(null)
      setProfile(null)
      return
    }

    setUser(nextUser)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (error) console.error('Error fetching user profile:', error)
    setProfile((data as UserProfile) ?? null)
  }, [])

  useEffect(() => {
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase calls inside this callback can deadlock, so defer them
      setTimeout(async () => {
        if (!active) return
        await syncFromUser(session?.user ?? null)
        if (active) setLoading(false)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [syncFromUser])

  // Trades the SMS-verified Firebase user for a Supabase session that RLS can check
  const completePhoneLogin = async (firebaseUser: FirebaseUser) => {
    const idToken = await firebaseUser.getIdToken()
    const res = await fetch('/api/auth/phone/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) {
      throw new Error('تعذر إكمال تسجيل الدخول، يرجى المحاولة مجدداً.')
    }

    const { access_token, refresh_token, restaurant_id } = await res.json()
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error

    await firebaseSignOut(auth).catch(() => {})
    await syncFromUser(data.user)
    return { restaurantId: (restaurant_id as string | null) ?? null }
  }

  const refreshProfile = async () => {
    await syncFromUser(user)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const openAuthModal = (callback?: () => void) => {
    if (callback) setOnSuccessCallback(() => callback)
    else setOnSuccessCallback(null)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
    setOnSuccessCallback(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isLoggedIn: !!user,
        logout,
        refreshProfile,
        completePhoneLogin,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        onSuccessCallback
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
