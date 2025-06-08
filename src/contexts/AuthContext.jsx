import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        // Check if user is admin - check both metadata locations
        const userRole = session.user.user_metadata?.role || session.user.raw_user_meta_data?.role
        setIsAdmin(userRole === 'admin')
        console.log('User session:', session.user)
        console.log('User role:', userRole)
        console.log('Is admin:', userRole === 'admin')
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          // Check if user is admin - check both metadata locations
          const userRole = session.user.user_metadata?.role || session.user.raw_user_meta_data?.role
          setIsAdmin(userRole === 'admin')
          console.log('Auth change - User:', session.user)
          console.log('Auth change - User role:', userRole)
          console.log('Auth change - Is admin:', userRole === 'admin')
        } else {
          setUser(null)
          setIsAdmin(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    // Use localhost for development, production URL for production
    const redirectUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5173/auth/callback'
      : `${window.location.origin}/auth/callback`
      
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...')
      
      // Always clear local state first
      setUser(null)
      setIsAdmin(false)
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase sign out error:', error)
        
        // If it's an "Auth session missing" error, that's actually fine - user is already signed out
        if (error.message?.includes('Auth session missing') || 
            error.message?.includes('session_not_found') ||
            error.message?.includes('Failed to fetch') || 
            error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
          console.log('Session already cleared or network error, proceeding with local cleanup...')
          // Clear any stored session data
          localStorage.removeItem('supabase.auth.token')
          sessionStorage.clear()
          return { error: null }
        }
        
        return { error }
      }
      
      console.log('Sign out successful')
      return { error: null }
    } catch (err) {
      console.error('Sign out exception:', err)
      
      // Always clear local state even if there's an error
      setUser(null)
      setIsAdmin(false)
      
      // If it's a session missing error or network error, treat as success
      if (err.message?.includes('Auth session missing') || 
          err.message?.includes('session_not_found') ||
          err.message?.includes('Failed to fetch') || 
          err.message?.includes('ERR_INTERNET_DISCONNECTED')) {
        console.log('Session error or network exception detected, clearing local session...')
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        return { error: null }
      }
      
      return { error: err }
    }
  }

  const value = {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 