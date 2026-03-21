'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { ShoppingCart, LogOut } from 'lucide-react'
import Image from 'next/image'
import { useCartStore } from '@/lib/store'

export function Navbar() {
  const { data: session } = useSession()
  const { items } = useCartStore()

  return (
    <nav className="bg-blue-600 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image 
                src="/logo.png" 
                alt="DynaLink Connect logo" 
                className="h-12 w-auto" 
                width={180} 
                height={60}
                priority
                quality={95}
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <Link href="/products" className="text-white hover:text-gray-200 font-medium">
              Products
            </Link>
            <Link href="/orders" className="text-white hover:text-gray-200 font-medium">
              Orders
            </Link>
            {session && (
              <>
                <Link href="/products" className="text-white hover:text-gray-200 font-medium">
                  Marketplace
                </Link>
                <Link href="/vendors" className="text-white hover:text-gray-200 font-medium">
                  Vendors
                </Link>
                {(session.user as any)?.isVendor && (
                  <Link href="/vendor/dashboard" className="text-green-300 hover:text-green-100 font-medium font-bold">
                    My Store
                  </Link>
                )}
                <Link href="/profile" className="text-white hover:text-gray-200 font-medium">
                  My Account
                </Link>
                {(session.user as any)?.role === 'admin' && (
                  <Link href="/admin/dashboard" className="text-yellow-300 hover:text-yellow-100 font-medium font-bold">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="relative text-white hover:text-gray-200">
              <ShoppingCart className="h-6 w-6" aria-label="View Cart" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {items.length}
              </span>
            </Link>
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-white">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-white hover:text-gray-200"
                  title="Sign Out"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                title="Sign In"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}