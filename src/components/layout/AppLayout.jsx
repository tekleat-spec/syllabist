import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileHeader from './MobileHeader';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Main content */}
      <main
        className="min-h-screen pb-20 md:pb-0 transition-[margin] duration-200 ease-in-out"
      >
        <div
          className="p-4 md:p-8 max-w-7xl mx-auto"
          style={{ paddingTop: undefined }}
        >
          {/* Mobile top padding for fixed header */}
          <div className="md:hidden h-14" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Desktop sidebar offset */}
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