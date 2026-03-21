import { MessageSquare } from 'lucide-react';
import './hero.css';

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="hero-background" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Text Content */}
          <div className="text-left lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Welcome to DynaLink Connect
            </h1>
            <p className="text-lg text-gray-100 mb-8">
              Fast, reliable delivery from your favorite vendors. Shop everything you need in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
                Delivery in 60 mins
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/products"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
              >
                Shop Now
              </a>
              <a
                href="/vendor/register"
                className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors text-center"
              >
                Become a Vendor
              </a>
              <a
                href="https://wa.me/1234567890?text=Hi%20there!%20I%20have%20a%20question%20about%20my%20order."
                target="_blank"
                rel="noreferrer noopener"
                className="bg-green-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                WhatsApp Us
              </a>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-lg opacity-50" />
              <img
                src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=500&q=80"
                alt="Shopping"
                className="relative rounded-lg shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}