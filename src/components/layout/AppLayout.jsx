import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Main content */}
      <main
        className="min-h-screen pb-20 md:pb-0 transition-[margin] duration-200 ease-in-out"
        style={{ marginLeft: undefined }}
      >
        <div
          className="p-4 md:p-8 max-w-7xl mx-auto transition-[padding] duration-200"
          style={{ paddingLeft: undefined }}
        >
          {/* Use inline style for responsive sidebar offset */}
          <div className="hidden md:contents" />
          <Outlet />
        </div>
      </main>

      {/* Invisible spacer for desktop sidebar */}
      <style>{`
        @media (min-width: 768px) {
          main {
            margin-left: ${collapsed ? '72px' : '260px'} !important;
          }
        }
      `}</style>
    </div>
  );
}