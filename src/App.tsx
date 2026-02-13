import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedLayout from './components/Layout/ProtectedLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LessonPlayer from './pages/LessonPlayer';
import ParentAdmin from './pages/ParentAdmin';
import InternalAdmin from './pages/Admin/InternalAdmin';
import PracticePlayer from './pages/PracticePlayer';
import CategoryDetail from './components/Dashboard/CategoryDetail';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/parent-admin" element={<ParentAdmin />} />
              <Route path="/admin" element={<InternalAdmin />} />
              <Route path="/lesson/:childId/:branchId/:lessonId" element={<LessonPlayer />} />
              <Route path="/lesson/:childId/:lessonId" element={<LessonPlayer />} />
              <Route path="/practice/:childId" element={<PracticePlayer />} />
              <Route path="/practice/:childId/:skillId" element={<PracticePlayer />} />
              <Route path="/category/:childId/:branchId" element={<CategoryDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
