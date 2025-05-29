import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  Play, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  User,
  CreditCard,
  Settings,
  ArrowRight
} from 'lucide-react'

// Component to handle "Start Learning" button
function GetStartLearningButton({ courseId }) {
  const [firstLesson, setFirstLesson] = useState(null)
  const [loading, setLoading] = useState(false)

  const getFirstLesson = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()
      
      setFirstLesson(data)
    } catch (error) {
      console.error('Error fetching first lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (courseId) {
      getFirstLesson()
    }
  }, [courseId])

  if (loading) {
    return (
      <button className="btn-primary text-sm py-2 px-3 opacity-50" disabled>
        Loading...
      </button>
    )
  }

  if (!firstLesson) {
    return null
  }

  return (
    <Link
      to={`/course/${courseId}/lesson/${firstLesson.id}`}
      className="btn-primary text-sm py-2 px-3 flex items-center space-x-1"
    >
      <Play className="h-3 w-3" />
      <span>Start Learning</span>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [purchasedCourses, setPurchasedCourses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedLessons: 0,
    totalSpent: 0,
    pendingPayments: 0
  })

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    
    fetchDashboardData()
  }, [user, navigate])

  const fetchDashboardData = async () => {
    try {
      // Fetch purchased courses (from purchases table)
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select(`
          *,
          courses(*)
        `)
        .eq('user_id', user.id)

      // Fetch approved payments that might not be in purchases yet
      const { data: approvedPayments } = await supabase
        .from('payments')
        .select(`
          *,
          courses(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')

      // Fetch all user payments for stats
      const { data: allPayments } = await supabase
        .from('payments')
        .select(`
          *,
          courses(price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Combine purchased courses from both sources
      const allPurchasedCourses = []
      const courseIds = new Set()

      // Add from purchases table
      if (purchasesData) {
        purchasesData.forEach(purchase => {
          if (purchase.courses && !courseIds.has(purchase.course_id)) {
            allPurchasedCourses.push({
              ...purchase.courses,
              purchase_date: purchase.created_at,
              source: 'purchase'
            })
            courseIds.add(purchase.course_id)
          }
        })
      }

      // Add from approved payments
      if (approvedPayments) {
        approvedPayments.forEach(payment => {
          if (payment.courses && !courseIds.has(payment.course_id)) {
            allPurchasedCourses.push({
              ...payment.courses,
              purchase_date: payment.created_at,
              source: 'payment'
            })
            courseIds.add(payment.course_id)
          }
        })
      }

      // Calculate stats
      const totalSpent = (allPayments || [])
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (p.courses?.price ? parseFloat(p.courses.price) : 0), 0)

      const pendingCount = (allPayments || []).filter(p => p.status === 'pending').length

      setStats({
        totalCourses: allPurchasedCourses.length,
        completedLessons: 0, // We'll implement this later with progress tracking
        totalSpent,
        pendingPayments: pendingCount
      })

      setPurchasedCourses(allPurchasedCourses)
      setPayments(allPayments || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null // Will redirect to auth
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.user_metadata?.full_name || user.email}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your learning journey.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100">
              <BookOpen className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-bold text-green-600">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Courses */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
              <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Browse More
              </Link>
            </div>

            {purchasedCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-500 mb-6">Start your learning journey by purchasing your first course.</p>
                <Link to="/" className="btn-primary">
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {purchasedCourses.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <img
                        src={course.thumbnail_url || '/placeholder-course.jpg'}
                        alt={course.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Purchased {new Date(course.purchase_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <CreditCard className="h-3 w-3 mr-1" />
                            ${course.price}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/course/${course.id}`}
                          className="btn-secondary text-sm py-2 px-3"
                        >
                          View Course
                        </Link>
                        {/* Quick start learning button */}
                        <GetStartLearningButton courseId={course.id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity & Account */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      payment.status === 'approved' 
                        ? 'bg-green-400'
                        : payment.status === 'rejected'
                        ? 'bg-red-400'
                        : 'bg-yellow-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        Payment {payment.status} for course
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <Link
                to="/"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Browse Courses</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                to="/auth"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Account Settings</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Account Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <span className="text-gray-600">Member since:</span>
                <p className="font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 