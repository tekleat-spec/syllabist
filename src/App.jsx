import { Toaster } from "@/components/ui/toaster"
import { useEffect, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// PageNotFound is lazy-loaded as PageNotFoundLazy below
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Courses = lazy(() => import('@/pages/Courses'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const Grades = lazy(() => import('@/pages/Grades'));
const Documents = lazy(() => import('@/pages/Documents'));
const Upload = lazy(() => import('@/pages/Upload'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));
const AssignmentsWorkshop = lazy(() => import('@/pages/AssignmentsWorkshop'));
const AiTutor = lazy(() => import('@/pages/AiTutor'));
const StudyScheduler = lazy(() => import('@/pages/StudyScheduler'));
const DocumentQA = lazy(() => import('@/pages/DocumentQA'));
const Research = lazy(() => import('@/pages/Research'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const ThankYou = lazy(() => import('@/pages/ThankYou'));
const Settings = lazy(() => import('@/pages/Settings'));
const PageNotFoundLazy = lazy(() => import('./lib/PageNotFound'));

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
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
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
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<PageNotFoundLazy />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  // Theme is controlled purely via CSS @media (prefers-color-scheme: dark) in index.css

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