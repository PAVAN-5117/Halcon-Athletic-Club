import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Club from './pages/Club'
import Training from './pages/Training'
import Coaches from './pages/Coaches'
import Memberships from './pages/Memberships'
import Schedule from './pages/Schedule'
import Journal from './pages/Journal'
import ArticlePage from './pages/ArticlePage'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Accessibility from './pages/Accessibility'
import NotFound from './pages/NotFound'
import CookieNotice from './components/CookieNotice'
import ConciergeChat from './components/ConciergeChat'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/club" element={<Club />} />
          <Route path="/training" element={<Training />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:slug" element={<ArticlePage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
          <Route path="/dashboard" element={<Dashboard isLoggedIn={isLoggedIn} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <CookieNotice />
      <ConciergeChat />
    </>
  )
}
