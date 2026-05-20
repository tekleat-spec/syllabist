import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAIN_TABS = ['/', '/courses', '/calendar', '/grades'];

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/upload': 'Upload',
  '/scheduler': 'Study Scheduler',
  '/research': 'Research',
  '/doc-qa': 'Document Q&A',
  '/workshop': 'Workshop',
  '/pricing': 'Upgrade to Pro',
  '/settings': 'Settings',
  '/audit': 'Audit Log',
  '/thank-you': 'Thank You',
};

export default function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMainTab = MAIN_TABS.includes(location.pathname);
  const label = ROUTE_LABELS[location.pathname];

  if (isMainTab && !label) return null;

  return (
    <header className={cn(
      'md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border flex items-center h-14 px-4',
    )} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {!isMainTab ? (
        <>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-primary font-medium text-sm mr-3"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <span className="font-semibold text-foreground text-base flex-1 text-center pr-12">
            {label || ''}
          </span>
        </>
      ) : (
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">Syllabist</span>
        </div>
      )}
    </header>
  );
}