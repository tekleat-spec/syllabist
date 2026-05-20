import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, GraduationCap, Sparkles, MoreHorizontal, Upload, FileText, CalendarDays, FlaskConical, Wrench, CreditCard, Settings2, ScrollText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const mainTabs = [
  { path: '/', icon: Sparkles, label: 'Tutor' },
  { path: '/courses', icon: BookOpen, label: 'Courses' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/grades', icon: GraduationCap, label: 'Grades' },
];

const moreItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/scheduler', icon: CalendarDays, label: 'Study Scheduler' },
  { path: '/research', icon: FlaskConical, label: 'Research' },
  { path: '/doc-qa', icon: BookOpen, label: 'Document Q&A' },
  { path: '/workshop', icon: Wrench, label: 'Workshop' },
  { path: '/pricing', icon: CreditCard, label: 'Upgrade to Pro' },
  { path: '/settings', icon: Settings2, label: 'Settings' },
  { path: '/audit', icon: ScrollText, label: 'Audit Log' },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const isMoreActive = moreItems.some(i => i.path === location.pathname);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-2 py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around">
          {mainTabs.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => { setShowMore(false); if (isActive) window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(v => !v)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors',
              (showMore || isMoreActive) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-card rounded-t-2xl border-t border-border pb-safe"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-3">More Features</p>
              <div className="grid grid-cols-3 gap-1 px-3">
                {moreItems.map(({ path, icon: Icon, label }) => {
                  const isActive = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setShowMore(false); }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}