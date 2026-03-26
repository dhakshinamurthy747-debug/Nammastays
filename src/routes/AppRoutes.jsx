import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'

import Home from '../pages/Home'
import Properties from '../pages/Properties'
import PropertyDetail from '../pages/PropertyDetail'
import Payment from '../pages/Payment'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import Owner from '../pages/Owner'
import Admin from '../pages/Admin'
import Bookings from '../pages/Bookings'
import ListProperty from '../pages/ListProperty'
import About from '../pages/About'
import Help from '../pages/Help'
import Cookies from '../pages/Cookies'
import Terms from '../pages/Terms'
import Privacy from '../pages/Privacy'
import Contact from '../pages/Contact'
import Hosts from '../pages/Hosts'
import Press from '../pages/Press'
import Careers from '../pages/Careers'
import SitemapPage from '../pages/SitemapPage'
import NotFound from '../pages/NotFound'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/list" element={<ListProperty />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/hosts" element={<Hosts />} />
        <Route path="/press" element={<Press />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<DashboardLayout />}>
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner"
          element={
            <ProtectedRoute>
              <Owner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
