import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import AuthCallback from './pages/AuthCallback'

// Placeholder components for now - we'll create these next
import CourseDetail from './pages/CourseDetail'
import Purchase from './pages/Purchase'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import AdminUpload from './pages/AdminUpload'
import Lesson from './pages/Lesson'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/course/:courseId/lesson/:lessonId" element={<Lesson />} />
            <Route path="/purchase/:id" element={<Purchase />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/upload" element={<AdminUpload />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App
