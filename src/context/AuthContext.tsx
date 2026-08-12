'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
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
  loginWithTestPhone: (phone: string) => Promise<void>
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
  loginWithTestPhone: async () => {},
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

  const fetchOrCreateProfile = async (firebaseUser: User) => {
    try {
      const phone = firebaseUser.phoneNumber || ''
      if (!phone) return

      // Single query: find by firebase UID or phone (saves one round-trip vs two separate queries)
      const { data: rows } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${firebaseUser.uid},phone.eq.${phone}`)
        .limit(2)

      const existingProfile = rows && rows.length > 0 ? rows[0] : null

      if (existingProfile) {
        setProfile(existingProfile as UserProfile)
      } else {
        // Create new profile for this user
        const newProfile: UserProfile = {
          id: firebaseUser.uid,
          phone: phone,
          full_name: firebaseUser.displayName || '(بدون اسم)',
          role: 'customer',
          restaurant_id: null
        }

        const { data: inserted } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()

        if (inserted && inserted.length > 0) {
          setProfile(inserted[0] as UserProfile)
        } else {
          setProfile(newProfile)
        }
      }
    } catch (err) {
      console.error('Error fetching or creating user profile:', err)
      setProfile({
        id: firebaseUser.uid,
        phone: firebaseUser.phoneNumber || '',
        full_name: '(بدون اسم)',
        role: 'customer',
        restaurant_id: null
      })
    }
  }

  useEffect(() => {
    // Check if test phone session exists in localStorage
    const savedTestPhone = typeof window !== 'undefined' ? localStorage.getItem('digital_menu_test_phone') : null
    if (savedTestPhone) {
      const uid = 'test-uid-' + savedTestPhone.replace(/[^0-9]/g, '')
      const fakeUser = { uid, phoneNumber: savedTestPhone } as any
      setUser(fakeUser)
      fetchOrCreateProfile(fakeUser)
      setLoading(false)
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchOrCreateProfile(firebaseUser)
      } else if (!savedTestPhone) {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loginWithTestPhone = async (phone: string) => {
    const uid = 'test-uid-' + phone.replace(/[^0-9]/g, '')
    const fakeUser = { uid, phoneNumber: phone } as any
    setUser(fakeUser)
    if (typeof window !== 'undefined') {
      localStorage.setItem('digital_menu_test_phone', phone)
    }
    await fetchOrCreateProfile(fakeUser)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchOrCreateProfile(user)
    }
  }

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('digital_menu_test_phone')
    }
    await firebaseSignOut(auth).catch(() => {})
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
        loginWithTestPhone,
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
