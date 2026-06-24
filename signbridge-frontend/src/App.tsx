import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell, ProtectedRoute, PublicRoute } from './components/layout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';
import Home from './pages/Home';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Vocabulary from './pages/Vocabulary';
import Stats from './pages/Stats';
import ComingSoon from './pages/ComingSoon';

function AppRoutes() {
  return (
    <Routes>
      {/* ── Públicas ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* ── Protegidas — usan AppShell (Navbar + Footer automático) ── */}

      {/* Página de Inicio — punto de entrada post-login */}
      <Route path="/home" element={
        <ProtectedRoute>
          <AppShell maxWidth={960}><Home /></AppShell>
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppShell maxWidth={960}><UserDashboard /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AppShell maxWidth={1100}><AdminDashboard /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/vocabulary" element={
        <ProtectedRoute>
          <AppShell maxWidth={960}><Vocabulary /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/voice-to-sign" element={
        <ProtectedRoute>
          <AppShell maxWidth={960}><ComingSoon /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/sign-to-text" element={
        <ProtectedRoute>
          <AppShell maxWidth={960}><ComingSoon /></AppShell>
        </ProtectedRoute>
      } />
      <Route path="/stats" element={
        <ProtectedRoute adminOnly>
          <AppShell maxWidth={900}><Stats /></AppShell>
        </ProtectedRoute>
      } />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}