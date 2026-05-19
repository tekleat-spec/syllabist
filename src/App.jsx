import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Courses from '@/pages/Courses';
import CalendarPage from '@/pages/CalendarPage';
import Grades from '@/pages/Grades';
import Documents from '@/pages/Documents';
import Upload from '@/pages/Upload';
import AuditLog from '@/pages/AuditLog';
import AssignmentsWorkshop from '@/pages/AssignmentsWorkshop';
import AiTutor from '@/pages/AiTutor';
import StudyScheduler from '@/pages/StudyScheduler';
import DocumentQA from '@/pages/DocumentQA';
import Research from '@/pages/Research';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<AiTutor />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/workshop" element={<AssignmentsWorkshop />} />
        <Route path="/scheduler" element={<StudyScheduler />} />
        <Route path="/doc-qa" element={<DocumentQA />} />
        <Route path="/research" element={<Research />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App