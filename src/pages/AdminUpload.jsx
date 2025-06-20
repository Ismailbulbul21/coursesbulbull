import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Upload,
  BookOpen,
  Video,
  DollarSign,
  FileText,
  Image as ImageIcon,
  XCircle,
  CheckCircle,
  Cloud,
  Film
} from 'lucide-react'

export default function AdminUpload() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadProgress, setUploadProgress] = useState({})
  
  // Course form state
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    price: '',
    is_free: false,
    thumbnail_url: '',
    thumbnail_file: null
  })
  
  // Lessons state
  const [lessons, setLessons] = useState([
    {
      id: 1,
      title: '',
      video_url: '',
      video_file: null,
      order_index: 0
    }
  ])

  const handleCourseChange = (e) => {
    const { name, value } = e.target
    setCourseData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleThumbnailFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for thumbnail')
        return
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Thumbnail file size must be less than 5MB')
        return
      }
      
      setCourseData(prev => ({
        ...prev,
        thumbnail_file: file,
        thumbnail_url: '' // Clear URL when file is selected
      }))
      setError('')
    }
  }

  const handleLessonChange = (id, field, value) => {
    setLessons(prev => prev.map(lesson => 
      lesson.id === id ? { ...lesson, [field]: value } : lesson
    ))
  }

  const handleVideoFileChange = (lessonId, file) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file')
        return
      }
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('Video file size must be less than 100MB')
        return
      }
      
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId 
          ? { ...lesson, video_file: file, video_url: '' } // Clear URL when file is selected
          : lesson
      ))
      setError('')
    }
  }

  const uploadFile = async (file, bucket, path) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    return data
  }

  const getPublicUrl = (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  const addLesson = () => {
    const newId = Math.max(...lessons.map(l => l.id)) + 1
    setLessons(prev => [...prev, {
      id: newId,
      title: '',
      video_url: '',
      video_file: null,
      order_index: prev.length
    }])
  }

  const removeLesson = (id) => {
    if (lessons.length === 1) {
      setError('Course must have at least one lesson')
      return
    }
    setLessons(prev => prev.filter(lesson => lesson.id !== id))
  }

  const validateForm = () => {
    if (!courseData.title.trim()) {
      setError('Course title is required')
      return false
    }
    if (!courseData.description.trim()) {
      setError('Course description is required')
      return false
    }
    if (!courseData.is_free && (!courseData.price || parseFloat(courseData.price) <= 0)) {
      setError('Course price must be greater than 0 for paid courses')
      return false
    }
    if (courseData.is_free && courseData.price && parseFloat(courseData.price) > 0) {
      setError('Free courses should have price set to 0')
      return false
    }
    
    // Validate lessons
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      if (!lesson.title.trim()) {
        setError(`Lesson ${i + 1} title is required`)
        return false
      }
      if (!lesson.video_url.trim() && !lesson.video_file) {
        setError(`Lesson ${i + 1} video URL or video file is required`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    setUploadProgress({})
    
    try {
      console.log('Starting course creation...')
      console.log('User:', user)
      console.log('Is Admin:', isAdmin)
      
      let thumbnailUrl = courseData.thumbnail_url

      // Upload thumbnail if file is selected
      if (courseData.thumbnail_file) {
        console.log('Uploading thumbnail...')
        setUploadProgress(prev => ({ ...prev, thumbnail: 0 }))
        
        const fileExt = courseData.thumbnail_file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `thumbnails/${fileName}`
        
        try {
          await uploadFile(courseData.thumbnail_file, 'course-thumbnails', filePath)
          thumbnailUrl = getPublicUrl('course-thumbnails', filePath)
          setUploadProgress(prev => ({ ...prev, thumbnail: 100 }))
          console.log('Thumbnail uploaded successfully:', thumbnailUrl)
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError)
          throw new Error(`Thumbnail upload failed: ${uploadError.message}`)
        }
      }

      console.log('Creating course record...')
      // Create course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert([{
          title: courseData.title,
          description: courseData.description,
          price: courseData.is_free ? 0 : parseFloat(courseData.price),
          is_free: courseData.is_free,
          thumbnail_url: thumbnailUrl || null
        }])
        .select()
        .single()

      if (courseError) {
        console.error('Course creation error:', courseError)
        throw courseError
      }
      
      console.log('Course created successfully:', course)

      // Upload videos and create lessons
      console.log('Creating lessons...')
      const lessonData = []
      
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i]
        let videoUrl = lesson.video_url

        // Upload video if file is selected
        if (lesson.video_file) {
          console.log(`Uploading video for lesson ${i + 1}...`)
          setUploadProgress(prev => ({ ...prev, [`video-${lesson.id}`]: 0 }))
          
          const fileExt = lesson.video_file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `videos/${fileName}`
          
          try {
            await uploadFile(lesson.video_file, 'lesson-videos', filePath)
            videoUrl = getPublicUrl('lesson-videos', filePath)
            setUploadProgress(prev => ({ ...prev, [`video-${lesson.id}`]: 100 }))
            console.log(`Video uploaded successfully for lesson ${i + 1}:`, videoUrl)
          } catch (uploadError) {
            console.error(`Video upload error for lesson ${i + 1}:`, uploadError)
            throw new Error(`Video upload failed for lesson ${i + 1}: ${uploadError.message}`)
          }
        }

        lessonData.push({
          course_id: course.id,
          title: lesson.title,
          video_url: videoUrl,
          order_index: i
        })
      }

      console.log('Inserting lessons:', lessonData)
      const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessonData)

      if (lessonsError) {
        console.error('Lessons creation error:', lessonsError)
        throw lessonsError
      }
      
      console.log('Lessons created successfully')

      setSuccess('Course created successfully!')
      
      // Reset form
      setCourseData({
        title: '',
        description: '',
        price: '',
        is_free: false,
        thumbnail_url: '',
        thumbnail_file: null
      })
      setLessons([{
        id: 1,
        title: '',
        video_url: '',
        video_file: null,
        order_index: 0
      }])
      setUploadProgress({})

      // Redirect to admin after success
      setTimeout(() => {
        navigate('/admin')
      }, 2000)

    } catch (err) {
      console.error('Error creating course:', err)
      
      // Provide more specific error messages
      if (err.message && err.message.includes('row-level security')) {
        setError('Authentication error: Please try signing out and signing back in, then try again.')
      } else if (err.message && err.message.includes('upload')) {
        setError(err.message)
      } else {
        setError(err.message || 'Failed to create course. Please check the console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Course</h1>
        <p className="text-gray-600">Add a new course with lessons to your platform</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Course Information */}
        <div className="card p-6">
          <div className="flex items-center mb-6">
            <BookOpen className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Course Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={courseData.title}
                onChange={handleCourseChange}
                className="input-field"
                placeholder="Enter course title"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Course Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={courseData.description}
                onChange={handleCourseChange}
                className="input-field"
                placeholder="Enter course description"
                required
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price (USD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  min="0"
                  value={courseData.price}
                  onChange={handleCourseChange}
                  disabled={courseData.is_free}
                  className={`input-field pl-10 ${courseData.is_free ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder={courseData.is_free ? "0.00 (Free Course)" : "0.00"}
                  required={!courseData.is_free}
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_free"
                  checked={courseData.is_free}
                  onChange={(e) => {
                    const isFree = e.target.checked
                    setCourseData(prev => ({
                      ...prev,
                      is_free: isFree,
                      price: isFree ? '0' : prev.price
                    }))
                  }}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Make this course free
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Free courses will be automatically accessible to all users without payment
              </p>
            </div>
            
            {/* Thumbnail Upload Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Thumbnail
              </label>
              
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Upload Image File (Recommended)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                        <Cloud className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {courseData.thumbnail_file ? courseData.thumbnail_file.name : 'Choose Image'}
                        </span>
                      </div>
                    </label>
                    {courseData.thumbnail_file && (
                      <button
                        type="button"
                        onClick={() => setCourseData(prev => ({ ...prev, thumbnail_file: null }))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {uploadProgress.thumbnail !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.thumbnail}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Upload progress: {uploadProgress.thumbnail}%</p>
                    </div>
                  )}
                </div>

                {/* URL Input (Alternative) */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Or Enter Image URL
                  </label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      id="thumbnail_url"
                      name="thumbnail_url"
                      value={courseData.thumbnail_url}
                      onChange={handleCourseChange}
                      disabled={!!courseData.thumbnail_file}
                      className="input-field pl-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Video className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Course Lessons</h2>
            </div>
            <button
              type="button"
              onClick={addLesson}
              className="btn-secondary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lesson</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Lesson {index + 1}
                  </h3>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLesson(lesson.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {/* Lesson Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={(e) => handleLessonChange(lesson.id, 'title', e.target.value)}
                      className="input-field"
                      placeholder="Enter lesson title"
                      required
                    />
                  </div>

                  {/* Video Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Video *
                    </label>
                    
                    <div className="space-y-4">
                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">
                          Upload Video File (Recommended)
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => handleVideoFileChange(lesson.id, e.target.files[0])}
                              className="hidden"
                            />
                            <div className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                              <Film className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {lesson.video_file ? lesson.video_file.name : 'Choose Video'}
                              </span>
                            </div>
                          </label>
                          {lesson.video_file && (
                            <button
                              type="button"
                              onClick={() => handleLessonChange(lesson.id, 'video_file', null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {uploadProgress[`video-${lesson.id}`] !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[`video-${lesson.id}`]}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Upload progress: {uploadProgress[`video-${lesson.id}`]}%</p>
                          </div>
                        )}
                      </div>

                      {/* URL Input (Alternative) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">
                          Or Enter Video URL
                        </label>
                        <input
                          type="url"
                          value={lesson.video_url}
                          onChange={(e) => handleLessonChange(lesson.id, 'video_url', e.target.value)}
                          disabled={!!lesson.video_file}
                          className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="https://youtube.com/watch?v=... or video URL"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Create Course</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
} 