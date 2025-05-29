import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Play, Lock, AlertCircle } from 'lucide-react'

export default function Lesson() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasPurchased, setHasPurchased] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    
    console.log('Lesson effect triggered - courseId:', courseId, 'lessonId:', lessonId)
    fetchLessonData()
  }, [courseId, lessonId, user])

  const fetchLessonData = async () => {
    try {
      console.log('Fetching lesson data for lessonId:', lessonId)
      
      // Check purchase status first
      const purchaseStatus = await checkPurchaseStatus()
      if (!purchaseStatus) {
        setError('You need to purchase this course to access the lessons.')
        setLoading(false)
        return
      }

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError

      // Fetch all lessons for navigation
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError

      // Fetch specific lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()

      if (lessonError) throw lessonError

      console.log('Lesson data fetched successfully:', lessonData.title, 'URL:', lessonData.video_url)

      setCourse(courseData)
      setLessons(lessonsData)
      setLesson(lessonData)
      setHasPurchased(true)

    } catch (err) {
      console.error('Error fetching lesson data:', err)
      setError(err.message || 'Failed to load lesson')
    } finally {
      setLoading(false)
    }
  }

  const checkPurchaseStatus = async () => {
    if (!user) return false

    try {
      // Check if user has a record in purchases table
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (purchaseData) return true

      // If not in purchases table, check if user has an approved payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'approved')
        .single()

      return !!paymentData
    } catch (err) {
      return false
    }
  }

  const getCurrentLessonIndex = () => {
    return lessons.findIndex(l => l.id === parseInt(lessonId))
  }

  const getNextLesson = () => {
    const currentIndex = getCurrentLessonIndex()
    return currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
  }

  const getPreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex()
    return currentIndex > 0 ? lessons[currentIndex - 1] : null
  }

  if (!user) {
    return null // Will redirect to auth
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !hasPurchased) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Lock className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">{error || 'You need to purchase this course to access the lessons.'}</p>
          <Link to={`/course/${courseId}`} className="btn-primary">
            Back to Course
          </Link>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lesson Not Found</h1>
          <Link to={`/course/${courseId}`} className="btn-primary">
            Back to Course
          </Link>
        </div>
      </div>
    )
  }

  const nextLesson = getNextLesson()
  const previousLesson = getPreviousLesson()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/course/${courseId}`}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {course?.title}
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
            <p className="text-sm text-gray-500">
              Lesson {getCurrentLessonIndex() + 1} of {lessons.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Video Area */}
        <div className="lg:col-span-3">
          <div className="bg-black rounded-lg overflow-hidden shadow-lg mb-6">
            <video
              key={lesson.id}
              controls
              width="100%"
              height="auto"
              className="w-full aspect-video"
              onError={(e) => {
                console.error('Video error:', e.target.error)
                console.error('Error code:', e.target.error?.code)
                console.error('Error message:', e.target.error?.message)
                console.error('Video URL:', lesson.video_url)
              }}
              onLoadedData={() => console.log('Video loaded successfully')}
              onCanPlay={() => console.log('Video can play')}
              preload="auto"
            >
              <source src={lesson.video_url} type="video/mp4" />
              <p>Your browser does not support the video tag. <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">Download the video</a></p>
            </video>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div>
              {previousLesson && (
                <Link
                  to={`/course/${courseId}/lesson/${previousLesson.id}`}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Link>
              )}
            </div>
            
            <div>
              {nextLesson && (
                <Link
                  to={`/course/${courseId}/lesson/${nextLesson.id}`}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Next Lesson</span>
                  <Play className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Lesson List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Course Content</h3>
            
            <div className="space-y-2">
              {lessons.map((lessonItem, index) => (
                <Link
                  key={lessonItem.id}
                  to={`/course/${courseId}/lesson/${lessonItem.id}`}
                  className={`block p-3 rounded-lg transition-colors ${
                    lessonItem.id === parseInt(lessonId)
                      ? 'bg-primary-50 border border-primary-200 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      lessonItem.id === parseInt(lessonId)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lessonItem.title}</p>
                    </div>
                    {lessonItem.id === parseInt(lessonId) && (
                      <Play className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 