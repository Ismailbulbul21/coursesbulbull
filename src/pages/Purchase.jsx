import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Phone, 
  CreditCard, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react'

export default function Purchase() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingPayment, setExistingPayment] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    
    fetchCourseAndPaymentStatus()
  }, [id, user])

  const fetchCourseAndPaymentStatus = async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Check if user already has a payment for this course
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (paymentData) {
        setExistingPayment(paymentData)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load course information')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    // Basic phone validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]{8,}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid phone number')
      return
    }

    setSubmitting(true)

    try {
      // Create payment record
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          course_id: id,
          phone_number: phoneNumber.trim(),
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      setSuccess('Payment submission successful! Your request has been sent for review.')
      setExistingPayment(data)
      setPhoneNumber('')

    } catch (err) {
      console.error('Error submitting payment:', err)
      setError(err.message || 'Failed to submit payment request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return null // Will redirect to auth
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course information...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-6">The course you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/course/${id}`}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Course</h1>
        <p className="text-gray-600">Complete your purchase to access all course content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-8">
            <img
              src={course.thumbnail_url || '/placeholder-course.jpg'}
              alt={course.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>
            <div className="text-3xl font-bold text-primary-600 mb-4">
              ${course.price}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <BookOpen className="h-4 w-4 mr-1" />
              <span>Full course access included</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="lg:col-span-2">
          {existingPayment ? (
            // Existing Payment Status
            <div className="card p-6">
      <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Submitted</h3>
                <p className="text-gray-600 mb-6">
                  Your payment request has been submitted and is currently under review.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Phone Number:</span>
                      <p className="text-gray-900">{existingPayment.phone_number}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        existingPayment.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : existingPayment.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {existingPayment.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Submitted:</span>
                      <p className="text-gray-900">
                        {new Date(existingPayment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {existingPayment.status === 'pending' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      We'll review your payment within 24 hours. You'll receive access once approved.
                    </p>
                    <button
                      onClick={fetchCourseAndPaymentStatus}
                      className="btn-secondary text-sm"
                    >
                      Check Status
                    </button>
                  </div>
                )}
                
                {existingPayment.status === 'approved' && (
                  <div>
                    <p className="text-green-600 mb-4">
                      ✅ Payment approved! You now have access to this course.
                    </p>
                    <Link to="/dashboard" className="btn-primary">
                      Go to My Courses
                    </Link>
                  </div>
                )}
                
                {existingPayment.status === 'rejected' && (
                  <div>
                    <p className="text-red-600 mb-4">
                      ❌ Payment was rejected. Please try again or contact support.
                    </p>
                    <button
                      onClick={() => setExistingPayment(null)}
                      className="btn-primary"
                    >
                      Submit New Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Payment Instructions and Form
            <>
              {/* Payment Instructions */}
              <div className="card p-6 mb-6">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-5 w-5 text-primary-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">LACAG BIXINTA </h3>
                </div>
                
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-primary-900 mb-2">Mobile Money Payment</h4>
                  <p className="text-primary-800 mb-3">
                    Lacagta numberkaan  exactly <strong>${course.price}</strong> numberkaan ku soo dir :
                  </p>
                  <div className="flex items-center justify-center bg-white rounded-lg p-4 border border-primary-300">
                    <Phone className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="text-xl font-bold text-primary-900">+252 61 7211084</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Qiimha lacagta waa kan : <strong>${course.price}</strong></span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Use the phone number you'll enter in the form below</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Keep your transaction receipt for reference</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="card p-6">
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 text-primary-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">Confirm Your Payment</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Markaad lacagta soo dirto , Soo qor  numberka aad ka soo dirtay  hoos ku soo qor.
                  After sending the payment, enter your phone number below to confirm your purchase.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Enter the phone number you used for payment"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This should be the same number you used to send the payment
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Confirm Payment'
                    )}
                  </button>
                </form>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> Your payment will be reviewed within 24 hours. 
                    Once approved, you'll have full access to all course materials.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 