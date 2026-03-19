'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profileLinks = [
    { href: '/profile', label: 'My Profile', icon: '👤' },
    { href: '/profile/promocodes', label: 'My Promo-codes', icon: '🎟️' },
    { href: '/profile/invite-friends', label: 'Invite a Friend', icon: '👥' },
    { href: '/profile/support', label: 'Support', icon: '💬' },
    { href: '/profile/about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen overflow-y-auto z-30`}
      >
        <nav className="p-6">
          <h2 className="text-2xl font-bold mb-8 text-blue-600">My Account</h2>
          <ul className="flex flex-col space-y-4">
            {profileLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition text-gray-700 hover:text-blue-600"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-12 w-full">
        {children}
      </main>
    </div>
  );
}