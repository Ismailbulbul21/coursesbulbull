import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Play, Clock, Star, Users, ShoppingCart, Lock } from 'lucide-react'

export default function CourseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasPurchased, setHasPurchased] = useState(false)

  useEffect(() => {
    fetchCourseDetails()
    if (user) {
      checkPurchaseStatus()
    }
  }, [id, user])

  const fetchCourseDetails = async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (courseError) throw courseError

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError

      setCourse(courseData)
      setLessons(lessonsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkPurchaseStatus = async () => {
    if (!user) return

    try {
      // First check if course is free
      if (course && course.is_free) {
        // Auto-enroll user in free course
        await autoEnrollInFreeCourse()
        setHasPurchased(true)
        return
      }

      // Check if user has a record in purchases table
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .single()

      if (purchaseData) {
        setHasPurchased(true)
        return
      }

      // If not in purchases table, check if user has an approved payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .eq('status', 'approved')
        .single()

      if (paymentData) {
        setHasPurchased(true)
        return
      }

      setHasPurchased(false)
    } catch (err) {
      // User hasn't purchased the course
      setHasPurchased(false)
    }
  }

  const autoEnrollInFreeCourse = async () => {
    try {
      // Check if user is already enrolled
      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .single()

      if (!existingPurchase) {
        // Auto-enroll user in free course
        const { error } = await supabase
          .from('purchases')
          .insert([{
            user_id: user.id,
            course_id: id
          }])

        if (error) {
          console.error('Error auto-enrolling in free course:', error)
        }
      }
    } catch (err) {
      // Enrollment might fail, but we still allow access to free courses
      console.error('Error checking/creating free course enrollment:', err)
    }
  }

  const handlePurchaseClick = () => {
    if (!user) {
      navigate('/auth')
      return
    }
    navigate(`/purchase/${id}`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-red-600">Error loading course: {error || 'Course not found'}</p>
          <Link to="/" className="btn-primary mt-4 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Course Header */}
          <div className="mb-8">
            <img
              src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'}
              alt={course.title}
              className="w-full h-64 object-cover rounded-xl mb-6"
            />
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {course.title}
            </h1>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center space-x-1">
                <Play className="h-4 w-4" />
                <span>{lessons.length} lessons</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>4.8</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>50 students</span>
              </div>
            </div>
            
            <p className="text-gray-700 text-lg leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Mobile Purchase Button - Only visible on mobile */}
          <div className="lg:hidden mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  {course.is_free ? (
                    <div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-lg font-bold rounded-full inline-block">
                        FREE
                      </div>
                      <p className="text-sm text-gray-600 mt-1">No payment required</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-primary-600">
                        ${course.price}
                      </div>
                      <p className="text-sm text-gray-600">One-time payment</p>
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  {hasPurchased ? (
                    <Link
                      to="/dashboard"
                      className="btn-primary px-6 py-3"
                    >
                      My Courses
                    </Link>
                  ) : course.is_free ? (
                    <button
                      onClick={() => {
                        if (user) {
                          checkPurchaseStatus()
                        } else {
                          navigate('/auth')
                        }
                      }}
                      className="btn-primary flex items-center space-x-2 px-6 py-3"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Learning</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchaseClick}
                      className="btn-primary flex items-center space-x-2 px-6 py-3"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>iibso/gado</span>
                    </button>
                  )}
                </div>
              </div>
              
              {hasPurchased && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium text-sm">✓ You own this course</p>
                </div>
              )}
            </div>
          </div>

          {/* Course Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>
            
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasPurchased ? (
                      <Link
                        to={`/course/${id}/lesson/${lesson.id}`}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                      >
                        <Play className="h-4 w-4" />
                        <span className="text-sm">Watch</span>
                      </Link>
                    ) : (
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <div className="text-center mb-6">
              {course.is_free ? (
                <div>
                  <div className="px-4 py-2 bg-green-100 text-green-800 text-2xl font-bold rounded-full inline-block mb-2">
                    FREE
                  </div>
                  <p className="text-gray-600">No payment required</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    ${course.price}
                  </div>
                  <p className="text-gray-600">One-time payment</p>
                </div>
              )}
            </div>

            {hasPurchased ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">✓ You own this course</p>
                </div>
                <Link
                  to="/dashboard"
                  className="w-full btn-primary text-center block"
                >
                  Go to My Courses
                </Link>
              </div>
            ) : course.is_free ? (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    if (user) {
                      checkPurchaseStatus()
                    } else {
                      navigate('/auth')
                    }
                  }}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Learning</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handlePurchaseClick}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>iibso/gado</span>
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">This course includes:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <Play className="h-4 w-4 text-green-500" />
                  <span>{lessons.length} video lessons</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span>Lifetime access</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>Community support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 