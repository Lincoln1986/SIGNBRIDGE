import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// ... resto de importsimport { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './views/auth/Login.jsx'
import Register from './views/auth/Register.jsx'
import ForgotPassword from './views/auth/ForgotPassword.jsx'
import ClientDashboard from './views/client/ClientDashboard.jsx'
import Vocabulary from './views/client/Vocabulary.jsx'
import SystemStats from './views/admin/SystemStats.jsx'
import UserManagement from './views/admin/UserManagement.jsx'
import ResetPassword from './views/shared/ResetPassword.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<ClientDashboard />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/admin/stats" element={<SystemStats />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App