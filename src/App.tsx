import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedLayout from './components/Layout/ProtectedLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LessonPlayer = lazy(() => import('./pages/LessonPlayer'));
const ParentAdmin = lazy(() => import('./pages/ParentAdmin'));
const InternalAdmin = lazy(() => import('./pages/Admin/InternalAdmin'));
const PracticePlayer = lazy(() => import('./pages/PracticePlayer'));
const CategoryDetail = lazy(() => import('./components/Dashboard/CategoryDetail'));
const QuestRun = lazy(() => import('./pages/QuestRun'));
const QuestBoard = lazy(() => import('./pages/QuestBoard'));
const SuperchargeSmoke = lazy(() => import('./pages/SuperchargeSmoke'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/supercharge-smoke" element={<SuperchargeSmoke />} />

              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/parent-admin" element={<ParentAdmin />} />
                <Route path="/admin" element={<InternalAdmin />} />
                <Route path="/lesson/:childId/:branchId/:lessonId" element={<LessonPlayer />} />
                <Route path="/lesson/:childId/:lessonId" element={<LessonPlayer />} />
                <Route path="/practice/:childId" element={<PracticePlayer />} />
                <Route path="/practice/:childId/:skillId" element={<PracticePlayer />} />
                <Route path="/category/:childId/:branchId" element={<CategoryDetail />} />
                <Route path="/quest-run/:childId" element={<QuestRun />} />
                <Route path="/quest-board/:childId" element={<QuestBoard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
