import React from 'react';
import { Zap, Users, Truck, Award, ArrowRight, Shield } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Lightning Fast',
      description: 'Experience blazingly fast checkout and delivery times'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Community Driven',
      description: 'Join millions of satisfied customers worldwide'
    },
    {
      icon: <Truck className="w-8 h-8" />,
      title: 'Free Shipping',
      description: 'Enjoy free shipping on orders over $50'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Best Quality',
      description: 'Curated products from trusted brands'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure Shopping',
      description: 'Your data is protected with enterprise-grade security'
    }
  ];

  const stats = [
    { number: '2M+', label: 'Active Users' },
    { number: '500K+', label: 'Products' },
    { number: '98%', label: 'Satisfaction' },
    { number: '24/7', label: 'Support' }
  ];

  const team = [
    { name: 'Sarah Chen', role: 'CEO & Founder', initials: 'SC' },
    { name: 'Michael Johnson', role: 'CTO', initials: 'MJ' },
    { name: 'Emma Williams', role: 'Head of Customer Success', initials: 'EW' },
    { name: 'David Brown', role: 'VP of Operations', initials: 'DB' }
  ];

  return (
    <div className="flex flex-col gap-12 p-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-12 text-white">
        <h1 className="text-5xl font-bold mb-4">About DynaLink Connect</h1>
        <p className="text-xl text-blue-100 max-w-2xl">
          We're revolutionizing online shopping by connecting people with the products they love through a seamless, enjoyable, and rewarding shopping experience.
        </p>
      </div>

      {/* Mission Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 mb-4">
            DynaLink Connect was founded with a simple but powerful mission: to make online shopping accessible, affordable, and enjoyable for everyone.
          </p>
          <p className="text-gray-700 mb-4">
            We believe that quality products shouldn't come with premium prices, and that every customer deserves exceptional service and support.
          </p>
          <p className="text-gray-700">
            Through innovation, integrity, and a customer-first approach, we're building the future of e-commerce.
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-12 border border-blue-200">
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-lg font-semibold text-gray-900">Founded in 2022</p>
            <p className="text-gray-600">Growing every day</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition">
            <p className="text-3xl font-bold text-blue-600 mb-2">{stat.number}</p>
            <p className="text-sm text-gray-600 font-semibold">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Why Choose Us */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose DynaLink Connect?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
              <div className="text-blue-600 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our Story */}
      <div className="bg-gray-50 rounded-xl p-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            DynaLink Connect was born from a frustration with the current state of online shopping. Our founders noticed that customers were often paying inflated prices and receiving mediocre services from large retail platforms.
          </p>
          <p>
            In 2022, we set out to change the game. We built DynaLink Connect from the ground up with a focus on three core values: affordability, quality, and exceptional customer service.
          </p>
          <p>
            Today, we've grown to serve millions of customers globally, partnering with thousands of quality brands and creators to bring you the best selection of products at the best prices.
          </p>
          <p>
            But our journey is far from over. We're constantly innovating, expanding our product range, and improving our services to give you the best possible shopping experience.
          </p>
        </div>
      </div>

      {/* Team Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Leadership Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{member.initials}</span>
              </div>
              <p className="font-bold text-gray-900 mb-1">{member.name}</p>
              <p className="text-sm text-blue-600 font-semibold">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-12 text-white">
        <h2 className="text-3xl font-bold mb-8 text-center">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ArrowRight className="w-6 h-6" />
              Customer First
            </h3>
            <p className="text-blue-100">
              Every decision we make is guided by what's best for our customers, not our bottom line.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ArrowRight className="w-6 h-6" />
              Quality & Integrity
            </h3>
            <p className="text-blue-100">
              We partner only with trusted brands and creators who share our commitment to excellence.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ArrowRight className="w-6 h-6" />
              Innovation
            </h3>
            <p className="text-blue-100">
              We're constantly evolving to give you better products, better prices, and better service.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Our Community</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Become part of millions of satisfied customers experiencing the DynaLink Connect difference.
        </p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
          Start Shopping Now
        </button>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-gray-600 mb-2">Email Us</p>
          <a href="mailto:hello@dynalinkconnect.com" className="text-blue-600 font-bold hover:text-blue-700">
            hello@dynalinkconnect.com
          </a>
        </div>
        <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-gray-600 mb-2">Call Us</p>
          <a href="tel:18005551234" className="text-blue-600 font-bold hover:text-blue-700">
            +1 (800) 555-1234
          </a>
        </div>
        <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-gray-600 mb-2">Visit Us</p>
          <p className="text-blue-600 font-bold">San Francisco, CA</p>
        </div>
      </div>
    </div>
  );
}