import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, GraduationCap, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/courses', icon: BookOpen, label: 'Courses' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/grades', icon: GraduationCap, label: 'Grades' },
  { path: '/upload', icon: Upload, label: 'Upload' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-2 py-1 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => { if (isActive) window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
      </div>
    </nav>
  );
}