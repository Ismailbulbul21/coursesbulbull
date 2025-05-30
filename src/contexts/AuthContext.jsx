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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase sign out error:', error)
        
        // If it's a network error, clear local session anyway
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
          console.log('Network error detected, clearing local session...')
          // Force clear local session
          setUser(null)
          setIsAdmin(false)
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
      
      // If it's a network error, clear local session anyway
      if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_INTERNET_DISCONNECTED')) {
        console.log('Network exception detected, clearing local session...')
        setUser(null)
        setIsAdmin(false)
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