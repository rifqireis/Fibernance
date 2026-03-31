import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Inventory from './pages/Inventory'
import Cashier from './pages/Cashier'
import Orders from './pages/Orders'
import Digiflazz from './pages/Digiflazz'
import DataSync from './pages/DataSync'
import { Button, cn } from './components/ui'

const navigationLinkClass = (isActive: boolean) =>
  cn(
    'block px-4 py-3 text-sm font-sans font-semibold transition-all duration-200 rounded-none',
    isActive
      ? 'bg-black !text-white'
      : 'text-gray-500 hover:bg-gray-100 hover:text-black',
  )

const App: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <BrowserRouter>

    {/* future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }} */}

      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeMenu}
          />
        )}

        {/* Sidebar - Left */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        >
          {/* Logo/Brand */}
          <div className="px-8 py-8 border-b border-gray-200">
            <h1 className="text-2xl font-serif font-semibold text-black">
              Fibernance
            </h1>
            <p className="text-xs text-gray-600 font-sans mt-2">
              Finance Tracker & Smart Cashier
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-8 py-8">
            <ul className="space-y-4">
              {/* Inventory Link */}
              <li>
                <NavLink
                  to="/"
                  onClick={closeMenu}
                  className={({ isActive }) => navigationLinkClass(isActive)}
                >
                  Inventory
                </NavLink>
              </li>

              {/* Cashier Link */}
              <li>
                <NavLink
                  to="/cashier"
                  onClick={closeMenu}
                  className={({ isActive }) => navigationLinkClass(isActive)}
                >
                  Cashier
                </NavLink>
              </li>

              {/* Orders Link */}
              <li>
                <NavLink
                  onClick={closeMenu}
                  to="/orders"
                  className={({ isActive }) => navigationLinkClass(isActive)}
                >
                  Orders
                </NavLink>
              </li>

              {/* Digiflazz Link */}
              <li>
                <NavLink
                  onClick={closeMenu}
                  to="/digiflazz"
                  className={({ isActive }) => navigationLinkClass(isActive)}
                >
                  Digiflazz
                </NavLink>
              </li>

              {/* DataSync Link */}
              <li>
                <NavLink
                  onClick={closeMenu}
                  to="/data-sync"
                  className={({ isActive }) => navigationLinkClass(isActive)}
                >
                  Data Sync
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Footer Info */}
          <div className="px-8 py-8 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-sans">
              v0.1.0
            </p>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            variant="ghost"
            className="h-auto border-0 p-1 hover:border-0 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
          <h1 className="text-lg font-serif font-semibold text-black">Fibernance</h1>
          <div className="w-6"></div>
        </header>

        {/* Main Content Area - Right */}
        <main className="flex-1 w-full lg:pt-0">
          <Routes>
            <Route path="/" element={<Inventory />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/digiflazz" element={<Digiflazz />} />
            <Route path="/data-sync" element={<DataSync />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
