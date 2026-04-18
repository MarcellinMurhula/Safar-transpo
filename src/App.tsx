/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './authContext';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for performance
import React, { Suspense, lazy } from 'react';

const Landing = lazy(() => import('./pages/Landing'));
const DashboardUS = lazy(() => import('./pages/DashboardUS'));
const DashboardOW = lazy(() => import('./pages/DashboardOW'));
const DashboardAD = lazy(() => import('./pages/DashboardAD'));

function AppRoutes() {
  const { user, profile, loading, selectedRole } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#08080A]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-white/50 font-medium tracking-widest text-xs uppercase">Safar'Transpo Charge...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Protected Dashboard Route with Role-based redirection */}
        <Route path="/dashboard" element={
          user ? (
            selectedRole === 'admin' ? <DashboardAD /> :
            selectedRole === 'owner' ? <DashboardOW /> :
            <DashboardUS />
          ) : <Navigate to="/" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AnimatePresence mode="wait">
            <AppRoutes />
          </AnimatePresence>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

