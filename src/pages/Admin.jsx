import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Upload, 
  Plus,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Film,
  Cloud
} from 'lucide-react'

export default function Admin() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0
  })
  const [courses, setCourses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [newLesson, setNewLesson] = useState({
    title: '',
    video_url: '',
    video_file: null
  })
  const [addingLesson, setAddingLesson] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showLessonsModal, setShowLessonsModal] = useState(false)
  const [courseLessons, setCourseLessons] = useState([])
  const [editingLesson, setEditingLesson] = useState(null)
  const [showEditLessonModal, setShowEditLessonModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  useEffect(() => {
    if (user && isAdmin) {
      fetchDashboardData()
    }
  }, [user, isAdmin])

  const fetchDashboardData = async () => {
    try {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch payments with course info
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          courses(title)
        `)
        .order('created_at', { ascending: false })

      console.log('Fetched payments:', paymentsData) // Debug log

      // Calculate stats
      const pendingCount = paymentsData?.filter(p => p.status === 'pending').length || 0
      const approvedPayments = paymentsData?.filter(p => p.status === 'approved') || []
      const totalRevenue = approvedPayments.reduce((sum, p) => {
        const course = coursesData?.find(c => c.id === p.course_id)
        return sum + (course ? parseFloat(course.price) : 0)
      }, 0)

      // Get unique user count from payments
      const uniqueUsers = new Set(paymentsData?.map(p => p.user_id) || []).size

      setStats({
        totalCourses: coursesData?.length || 0,
        totalUsers: uniqueUsers || 0,
        totalRevenue,
        pendingPayments: pendingCount
      })

      setCourses(coursesData || [])
      setPayments(paymentsData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentAction = async (paymentId, action) => {
    try {
      let status
      switch (action) {
        case 'approve':
          status = 'approved'
          break
        case 'reject':
          status = 'rejected'
          break
        case 'cancel':
          status = 'cancelled'
          break
        default:
          throw new Error('Invalid action')
      }

      const { error } = await supabase
        .from('payments')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', paymentId)

      if (error) throw error

      // If approved, create purchase record
      if (status === 'approved') {
        const payment = payments.find(p => p.id === paymentId)
        if (payment) {
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert([{
              user_id: payment.user_id,
              course_id: payment.course_id
            }])

          if (purchaseError) throw purchaseError
        }
      }

      // If cancelled, remove any existing purchase record
      if (status === 'cancelled') {
        const payment = payments.find(p => p.id === paymentId)
        if (payment) {
          const { error: deleteError } = await supabase
            .from('purchases')
            .delete()
            .eq('user_id', payment.user_id)
            .eq('course_id', payment.course_id)

          if (deleteError) {
            console.warn('Could not delete purchase record:', deleteError)
          }
        }
      }

      await fetchDashboardData()
      alert(`Payment ${action}d successfully!`)

    } catch (err) {
      console.error(`Error ${action}ing payment:`, err)
      alert(`Failed to ${action} payment: ${err.message}`)
    }
  }

  const deleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all related lessons and payments.')) {
      return
    }

    try {
      // Delete related data first
      await supabase.from('lessons').delete().eq('course_id', courseId)
      await supabase.from('payments').delete().eq('course_id', courseId)
      await supabase.from('purchases').delete().eq('course_id', courseId)
      
      // Delete course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error

      fetchDashboardData()
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  const openAddLessonModal = (course) => {
    setSelectedCourse(course)
    setShowAddLessonModal(true)
    setNewLesson({
      title: '',
      video_url: '',
      video_file: null
    })
  }

  const closeAddLessonModal = () => {
    setShowAddLessonModal(false)
    setSelectedCourse(null)
    setNewLesson({
      title: '',
      video_url: '',
      video_file: null
    })
    setUploadProgress(0)
  }

  const handleLessonChange = (field, value) => {
    setNewLesson(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleVideoFileChange = (file) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file')
        return
      }
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        alert('Video file size must be less than 100MB')
        return
      }
      
      setNewLesson(prev => ({
        ...prev,
        video_file: file,
        video_url: '' // Clear URL when file is selected
      }))
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

  const handleAddLesson = async (e) => {
    e.preventDefault()
    
    if (!newLesson.title.trim()) {
      alert('Lesson title is required')
      return
    }
    
    if (!newLesson.video_url.trim() && !newLesson.video_file) {
      alert('Video URL or video file is required')
      return
    }

    setAddingLesson(true)
    
    try {
      let videoUrl = newLesson.video_url

      // Upload video if file is selected
      if (newLesson.video_file) {
        setUploadProgress(0)
        
        const fileExt = newLesson.video_file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `videos/${fileName}`
        
        await uploadFile(newLesson.video_file, 'lesson-videos', filePath)
        videoUrl = getPublicUrl('lesson-videos', filePath)
        setUploadProgress(100)
      }

      // Get the next order index
      const { data: existingLessons } = await supabase
        .from('lessons')
        .select('order_index')
        .eq('course_id', selectedCourse.id)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = existingLessons && existingLessons.length > 0 
        ? existingLessons[0].order_index + 1 
        : 0

      // Create lesson
      const { error } = await supabase
        .from('lessons')
        .insert({
          course_id: selectedCourse.id,
          title: newLesson.title,
          video_url: videoUrl,
          order_index: nextOrderIndex
        })

      if (error) throw error

      alert('Lesson added successfully!')
      closeAddLessonModal()
      fetchDashboardData()

    } catch (error) {
      console.error('Error adding lesson:', error)
      alert('Failed to add lesson: ' + error.message)
    } finally {
      setAddingLesson(false)
      setUploadProgress(0)
    }
  }

  const viewLessons = async (course) => {
    try {
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index', { ascending: true })

      if (error) throw error

      setSelectedCourse(course)
      setCourseLessons(lessons || [])
      setShowLessonsModal(true)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      alert('Failed to load lessons')
    }
  }

  const closeLessonsModal = () => {
    setShowLessonsModal(false)
    setCourseLessons([])
    setSelectedCourse(null)
  }

  const openEditLessonModal = (lesson) => {
    setEditingLesson({
      ...lesson,
      video_file: null
    })
    setShowEditLessonModal(true)
  }

  const closeEditLessonModal = () => {
    setShowEditLessonModal(false)
    setEditingLesson(null)
    setUploadProgress(0)
  }

  const handleEditLesson = async (e) => {
    e.preventDefault()
    
    if (!editingLesson.title.trim()) {
      alert('Lesson title is required')
      return
    }

    setAddingLesson(true)
    
    try {
      let videoUrl = editingLesson.video_url

      // Upload new video if file is selected
      if (editingLesson.video_file) {
        setUploadProgress(0)
        
        const fileExt = editingLesson.video_file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `videos/${fileName}`
        
        await uploadFile(editingLesson.video_file, 'lesson-videos', filePath)
        videoUrl = getPublicUrl('lesson-videos', filePath)
        setUploadProgress(100)
      }

      // Update lesson
      const { error } = await supabase
        .from('lessons')
        .update({
          title: editingLesson.title,
          video_url: videoUrl
        })
        .eq('id', editingLesson.id)

      if (error) throw error

      alert('Lesson updated successfully!')
      closeEditLessonModal()
      // Refresh lessons list
      viewLessons(selectedCourse)

    } catch (error) {
      console.error('Error updating lesson:', error)
      alert('Failed to update lesson: ' + error.message)
    } finally {
      setAddingLesson(false)
      setUploadProgress(0)
    }
  }

  const deleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)

      if (error) throw error

      alert('Lesson deleted successfully!')
      // Refresh lessons list
      viewLessons(selectedCourse)
      fetchDashboardData()

    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Failed to delete lesson: ' + error.message)
    }
  }

  const openEditCourseModal = (course) => {
    setEditingCourse({
      ...course,
      thumbnail_file: null
    })
    setShowEditCourseModal(true)
  }

  const closeEditCourseModal = () => {
    setShowEditCourseModal(false)
    setEditingCourse(null)
    setUploadProgress(0)
  }

  const handleCourseChange = (field, value) => {
    setEditingCourse(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleThumbnailFileChange = (file) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB')
        return
      }
      
      setEditingCourse(prev => ({
        ...prev,
        thumbnail_file: file,
        thumbnail_url: '' // Clear URL when file is selected
      }))
    }
  }

  const handleEditCourse = async (e) => {
    e.preventDefault()
    
    if (!editingCourse.title.trim()) {
      alert('Course title is required')
      return
    }
    
    if (!editingCourse.description.trim()) {
      alert('Course description is required')
      return
    }
    
    if (!editingCourse.price || parseFloat(editingCourse.price) <= 0) {
      alert('Course price must be greater than 0')
      return
    }

    setAddingLesson(true) // Reuse the loading state
    
    try {
      let thumbnailUrl = editingCourse.thumbnail_url

      // Upload new thumbnail if file is selected
      if (editingCourse.thumbnail_file) {
        setUploadProgress(0)
        
        const fileExt = editingCourse.thumbnail_file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `thumbnails/${fileName}`
        
        await uploadFile(editingCourse.thumbnail_file, 'course-thumbnails', filePath)
        thumbnailUrl = getPublicUrl('course-thumbnails', filePath)
        setUploadProgress(100)
      }

      // Update course
      const { error } = await supabase
        .from('courses')
        .update({
          title: editingCourse.title,
          description: editingCourse.description,
          price: parseFloat(editingCourse.price),
          thumbnail_url: thumbnailUrl || null
        })
        .eq('id', editingCourse.id)

      if (error) throw error

      alert('Course updated successfully!')
      closeEditCourseModal()
      fetchDashboardData()

    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course: ' + error.message)
    } finally {
      setAddingLesson(false)
      setUploadProgress(0)
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link
          to="/admin/upload"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'courses'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payments ({payments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Payment for "{payment.courses?.title}"
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payment.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No courses</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
              <div className="mt-6">
                <Link to="/admin/upload" className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="card">
                  <img
                    src={course.thumbnail_url || '/placeholder-course.jpg'}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary-600">${course.price}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(course.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Link
                          to={`/course/${course.id}`}
                          className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Link>
                        <button
                          onClick={() => openEditCourseModal(course)}
                          className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-sm py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => viewLessons(course)}
                          className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Lessons
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAddLessonModal(course)}
                          className="flex-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Lesson
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="flex-1 btn-danger text-sm py-2 flex items-center justify-center"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
              <p className="mt-1 text-sm text-gray-500">Payment requests will appear here.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.courses?.title || 'Unknown Course'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.user_email || 'Email not available'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.phone_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : payment.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {payment.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handlePaymentAction(payment.id, 'approve')}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handlePaymentAction(payment.id, 'reject')}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            {payment.status === 'approved' && (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this approved payment? This will revoke the user\'s access to the course.')) {
                                    handlePaymentAction(payment.id, 'cancel')
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </button>
                            )}
                            {(payment.status === 'rejected' || payment.status === 'cancelled') && (
                              <button
                                onClick={() => handlePaymentAction(payment.id, 'approve')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Lesson to "{selectedCourse?.title}"
                </h2>
                <button
                  onClick={closeAddLessonModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddLesson} className="space-y-4">
                {/* Lesson Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={newLesson.title}
                    onChange={(e) => handleLessonChange('title', e.target.value)}
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
                            onChange={(e) => handleVideoFileChange(e.target.files[0])}
                            className="hidden"
                          />
                          <div className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                            <Film className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {newLesson.video_file ? newLesson.video_file.name : 'Choose Video'}
                            </span>
                          </div>
                        </label>
                        {newLesson.video_file && (
                          <button
                            type="button"
                            onClick={() => handleLessonChange('video_file', null)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload progress: {uploadProgress}%</p>
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
                        value={newLesson.video_url}
                        onChange={(e) => handleLessonChange('video_url', e.target.value)}
                        disabled={!!newLesson.video_file}
                        className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://youtube.com/watch?v=... or video URL"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeAddLessonModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLesson}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingLesson ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Add Lesson</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Lessons Modal */}
      {showLessonsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Lessons for "{selectedCourse?.title}"
                </h2>
                <button
                  onClick={closeLessonsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {courseLessons.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No lessons found for this course.</p>
                  <button
                    onClick={() => {
                      closeLessonsModal()
                      openAddLessonModal(selectedCourse)
                    }}
                    className="mt-4 btn-primary"
                  >
                    Add First Lesson
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseLessons.map((lesson, index) => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                            <p className="text-sm text-gray-500">
                              Created: {new Date(lesson.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditLessonModal(lesson)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteLesson(lesson.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {showEditLessonModal && editingLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Lesson
                </h2>
                <button
                  onClick={closeEditLessonModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditLesson} className="space-y-4">
                {/* Lesson Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={editingLesson.title}
                    onChange={(e) => setEditingLesson(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    placeholder="Enter lesson title"
                    required
                  />
                </div>

                {/* Current Video */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Video
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    Video is set and ready to play
                  </div>
                </div>

                {/* Video Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Replace Video (Optional)
                  </label>
                  
                  <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Upload New Video File
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setEditingLesson(prev => ({ ...prev, video_file: e.target.files[0] }))}
                            className="hidden"
                          />
                          <div className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                            <Film className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {editingLesson.video_file ? editingLesson.video_file.name : 'Choose New Video'}
                            </span>
                          </div>
                        </label>
                        {editingLesson.video_file && (
                          <button
                            type="button"
                            onClick={() => setEditingLesson(prev => ({ ...prev, video_file: null }))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload progress: {uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeEditLessonModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLesson}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingLesson ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4" />
                        <span>Update Lesson</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Course
                </h2>
                <button
                  onClick={closeEditCourseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditCourse} className="space-y-4">
                {/* Course Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={editingCourse.title}
                    onChange={(e) => handleCourseChange('title', e.target.value)}
                    className="input-field"
                    placeholder="Enter course title"
                    required
                  />
                </div>

                {/* Course Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Description *
                  </label>
                  <textarea
                    value={editingCourse.description}
                    onChange={(e) => handleCourseChange('description', e.target.value)}
                    className="input-field"
                    placeholder="Enter course description"
                    required
                  />
                </div>

                {/* Course Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Price *
                  </label>
                  <input
                    type="number"
                    value={editingCourse.price}
                    onChange={(e) => handleCourseChange('price', e.target.value)}
                    className="input-field"
                    placeholder="Enter course price"
                    required
                  />
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Thumbnail *
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleThumbnailFileChange(e.target.files[0])}
                        className="hidden"
                      />
                      <div className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                        <Cloud className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {editingCourse.thumbnail_file ? editingCourse.thumbnail_file.name : 'Choose Thumbnail'}
                        </span>
                      </div>
                    </label>
                    {editingCourse.thumbnail_file && (
                      <button
                        type="button"
                        onClick={() => handleCourseChange('thumbnail_file', null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeEditCourseModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLesson}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingLesson ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4" />
                        <span>Update Course</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 