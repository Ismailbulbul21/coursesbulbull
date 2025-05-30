import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is authenticated after the OAuth callback
    if (user) {
      // Redirect to dashboard if authenticated
      navigate('/dashboard')
    } else {
      // If not authenticated after a brief delay, redirect to auth page
      const timer = setTimeout(() => {
        navigate('/auth')
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Completing your sign in...
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you to your dashboard.
        </p>
      </div>
    </div>
  )
} 