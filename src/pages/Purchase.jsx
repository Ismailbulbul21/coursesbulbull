import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Phone, 
  CheckCircle,
  AlertCircle,
  Clock
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
      setError('Ma suurtagal in la soo raro macluumaadka courseka')
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
      setError('Fadlan gali numberkaaga')
      return
    }

    // Basic phone validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]{8,}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('Fadlan gali number sax ah')
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
          user_email: user.email,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      setSuccess('Lacag bixintaada waa la diray! Waa la eegi doonaa 24 saacadood gudahood.')
      setExistingPayment(data)
      setPhoneNumber('')

    } catch (err) {
      console.error('Error submitting payment:', err)
      setError('Lacag bixinta ma guulaysan. Fadlan isku day mar kale.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return null // Will redirect to auth
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Waa la soo raraya...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Course ma jiro</h1>
          <p className="text-gray-600 mb-6">Courseka aad raadinayso ma jiro.</p>
          <Link to="/" className="btn-primary">
            Ku noqo bogga hore
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/course/${id}`}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Dib u noqo
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lacag Bixinta</h1>
      </div>

      {existingPayment ? (
        // Existing Payment Status
        <div className="card p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Lacag bixintaada waa la diray</h3>
          <p className="text-gray-600 mb-4">
            Lacag bixintaada waa la eegayaa. Waxaad heli doontaa jawaab 24 saacadood gudahood.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Numberkaaga:</p>
            <p className="font-semibold text-gray-900">{existingPayment.phone_number}</p>
          </div>

          {existingPayment.status === 'pending' && (
            <button
              onClick={fetchCourseAndPaymentStatus}
              className="btn-secondary text-sm"
            >
              Hubi xaaladda
            </button>
          )}
          
          {existingPayment.status === 'approved' && (
            <div>
              <p className="text-green-600 mb-4">
                ✅ Lacag bixintaada waa la aqbalay! Hadda waxaad geli kartaa courseka.
              </p>
              <Link to="/dashboard" className="btn-primary">
                Aad courseyada
              </Link>
            </div>
          )}
          
          {existingPayment.status === 'rejected' && (
            <div>
              <p className="text-red-600 mb-4">
                ❌ Lacag bixintaada waa la diiday. Fadlan isku day mar kale.
              </p>
              <button
                onClick={() => setExistingPayment(null)}
                className="btn-primary"
              >
                Lacag cusub dir
              </button>
            </div>
          )}
        </div>
      ) : (
        // Payment Form - Simple and Clean
        <div className="space-y-6">
          {/* Course Info */}
          <div className="card p-4">
            <div className="flex items-center space-x-4">
              <img
                src={course.thumbnail_url || '/placeholder-course.jpg'}
                alt={course.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{course.title}</h3>
                <p className="text-2xl font-bold text-primary-600">${course.price}</p>
              </div>
            </div>
          </div>

          {/* Payment Instructions - Simple */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sidee lacagta u diraysaa</h3>
            
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
              <p className="text-primary-800 mb-3 text-center">
                Lacagta <strong>${course.price}</strong> numberkaan u dir:
              </p>
              <div className="flex items-center justify-center bg-white rounded-lg p-4 border border-primary-300">
                <Phone className="h-5 w-5 text-primary-600 mr-2" />
                <span className="text-xl font-bold text-primary-900">+ 061 7211084</span>
              </div>
            </div>

            {/* Phone Number Input - Prominent */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="numberkaaga" className="block text-md font-medium text-gray-700 mb-2">
                  Numberkaaga aad lacagta ka soo dirtay meeshaan ku qor :
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="input-field pl-10 text-lg py-3"
                    placeholder="Tusaale: +252 61 1234567"
                    required
                  />
                </div>
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
                className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Waa la diraya...
                  </div>
                ) : (
                  'Xaqiiji Lacag Bixinta'
                )}
              </button>
            </form>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                Waad mahadsantahay. Waa la eegi doonaa lacag bixintaada 24 saacadood gudahood.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 