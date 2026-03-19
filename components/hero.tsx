import { MessageSquare } from 'lucide-react';
import './hero.css';

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="hero-background" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6 text-white">
            Welcome to DynaLink Connect
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
              Delivery in 60 mins
            </span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/products"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
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
      </div>
    </div>
  );
}