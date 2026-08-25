import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import PageTransition from './components/PageTransition';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import InterviewSession from './pages/InterviewSession';
import BuyCredits from './pages/BuyCredits';
import NotFound from './pages/NotFound';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/interview/new" element={<PageTransition><NewInterview /></PageTransition>} />
          <Route path="/interview/:id" element={<PageTransition><InterviewSession /></PageTransition>} />
          <Route path="/buy-credits" element={<PageTransition><BuyCredits /></PageTransition>} />
        </Route>

        {/* Fallback */}
        <Route path="/404" element={<PageTransition><NotFound /></PageTransition>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AnimatedRoutes />
    </AuthProvider>
  );
}
