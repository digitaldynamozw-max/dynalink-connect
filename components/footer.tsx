'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Heart, Zap, Package, Truck } from 'lucide-react'
import { useState } from 'react'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center space-x-2 group">
                <div className="bg-gradient-to-br from-blue-400 to-purple-600 p-1.5 rounded-lg transform group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                  DynaLink Connect
                </h2>
              </div>
              <p className="text-slate-300 leading-relaxed text-sm max-w-sm">
                Experience next-generation e-commerce with seamless shopping and exceptional service.
              </p>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="flex items-center space-x-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 hover:border-blue-500/50 transition-colors duration-300">
                  <Truck className="h-3 w-3 text-blue-400" />
                  <span className="text-xs text-slate-300">Fast Delivery</span>
                </div>
                <div className="flex items-center space-x-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 hover:border-purple-500/50 transition-colors duration-300">
                  <Package className="h-3 w-3 text-purple-400" />
                  <span className="text-xs text-slate-300">Premium Quality</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <span className="w-1 h-3 bg-gradient-to-b from-blue-400 to-purple-600 rounded"></span>
                <span>Explore</span>
              </h3>
              <ul className="space-y-2">
                {['Products', 'Categories', 'Best Sellers', 'New Arrivals'].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-slate-300 hover:text-white transition-colors duration-300 flex items-center space-x-2 group text-sm"
                    >
                      <span className="w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      <span>{item}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <span className="w-1 h-3 bg-gradient-to-b from-purple-400 to-pink-600 rounded"></span>
                <span>Support</span>
              </h3>
              <ul className="space-y-2">
                {['Help Center', 'Contact Us', 'Shipping Info', 'Returns'].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-slate-300 hover:text-white transition-colors duration-300 flex items-center space-x-2 group text-sm"
                    >
                      <span className="w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      <span>{item}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <span className="w-1 h-3 bg-gradient-to-b from-pink-400 to-red-600 rounded"></span>
                <span>Newsletter</span>
              </h3>
              <p className="text-slate-300 text-xs">
                Subscribe for special offers and updates.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-1.5 bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 transition-colors duration-300 rounded-l"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-sm transition-all duration-300 rounded-r transform hover:scale-105 active:scale-95"
                  >
                    {subscribed ? '✓' : '→'}
                  </button>
                </div>
                {subscribed && (
                  <p className="text-xs text-green-400 animate-pulse">Thanks for subscribing!</p>
                )}
              </form>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-700/50">
            <div className="flex items-center space-x-3 group hover:bg-slate-700/30 p-2 rounded-lg transition-colors duration-300">
              <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors duration-300">
                <Phone className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Call us</p>
                <p className="text-white font-semibold text-sm">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 group hover:bg-slate-700/30 p-2 rounded-lg transition-colors duration-300">
              <div className="bg-purple-500/20 p-2 rounded-lg group-hover:bg-purple-500/30 transition-colors duration-300">
                <Mail className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Email us</p>
                <p className="text-white font-semibold text-sm">support@dynalink.com</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 group hover:bg-slate-700/30 p-2 rounded-lg transition-colors duration-300">
              <div className="bg-pink-500/20 p-2 rounded-lg group-hover:bg-pink-500/30 transition-colors duration-300">
                <MapPin className="h-4 w-4 text-pink-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Visit us</p>
                <p className="text-white font-semibold text-sm">123 Tech Street, NY</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
              {/* Copyright */}
              <div className="text-slate-400 text-xs">
                <p>© 2026 DynaLink Connect. All rights reserved with <Heart className="h-3 w-3 inline text-red-500 animate-pulse" /></p>
              </div>

              {/* Social Media */}
              <div className="flex items-center space-x-3">
                {[
                  { icon: Facebook, label: 'Facebook', color: 'hover:text-blue-400' },
                  { icon: Twitter, label: 'Twitter', color: 'hover:text-sky-400' },
                  { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-600' },
                  { icon: Instagram, label: 'Instagram', color: 'hover:text-pink-400' },
                ].map(({ icon: Icon, label, color }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className={`p-1.5 bg-slate-700/50 hover:bg-slate-600 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>

              {/* Legal Links */}
              <div className="flex items-center space-x-4 text-xs">
                <Link href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                  Privacy
                </Link>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                  Terms
                </Link>
                <Link href="#" className="text-slate-400 hover:text-white transition-colors duration-300">
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
