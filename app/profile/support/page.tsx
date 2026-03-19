'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Phone, MessageSquare, Clock, ChevronDown, Send, CheckCircle, AlertCircle } from 'lucide-react'

interface SupportTicket {
  id: string
  subject: string
  message: string
  status: string
  priority: string
  response: string | null
  createdAt: string
}

interface Stats {
  tickets: SupportTicket[]
  open: number
  resolved: number
}

export default function Support() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null)
  const [formData, setFormData] = useState({ subject: '', message: '', priority: 'normal' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const faqs = [
    {
      id: 1,
      question: 'How do I reset my password?',
      answer: 'Go to the Edit Profile section, scroll to "Change Password" and enter your current password followed by your new password. Click "Save Changes" when done.'
    },
    {
      id: 2,
      question: 'How can I update my profile picture?',
      answer: 'Visit your Edit Profile page. On the left side, there\'s a profile picture section where you can click "Upload Picture" and select an image from your device.'
    },
    {
      id: 3,
      question: 'What can I do with promo codes?',
      answer: 'Promo codes provide discounts on your purchases. You can view all your active codes in the "My Promo-codes" section and use them during checkout.'
    },
    {
      id: 4,
      question: 'How does the referral program work?',
      answer: 'In the "Invite a Friend" section, share your referral link with friends. When they sign up and make their first purchase, you both receive rewards!'
    },
    {
      id: 5,
      question: 'How do I contact customer support?',
      answer: 'You can reach our support team via email at support@dynalinkconnect.com, through the live chat, or by filling out the contact form below.'
    },
    {
      id: 6,
      question: 'How long does it take to process refunds?',
      answer: 'Refunds are typically processed within 5-7 business days after approval. You\'ll receive an email confirmation once your refund has been initiated.'
    }
  ]

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/profile/support')
        if (!res.ok) throw new Error('Failed to fetch tickets')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError('Failed to load support tickets')
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject || !formData.message) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/profile/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Failed to submit ticket')
      setSubmitted(true)
      setFormData({ subject: '', message: '', priority: 'normal' })
      
      // Refresh tickets
      const refreshRes = await fetch('/api/profile/support')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setStats(data)
      }
      
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to submit ticket' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="text-red-600">{error || 'Failed to load data'}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Support & Help</h1>
        <p className="text-gray-600">Get help with your account, orders, and more</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <Mail className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-700 mb-4">Response time: 24 hours</p>
          <a href="mailto:support@dynalinkconnect.com" className="text-blue-600 font-semibold hover:text-blue-700">
            support@dynalinkconnect.com
          </a>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <MessageSquare className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
          <p className="text-sm text-gray-700 mb-4">Response time: 5-10 minutes</p>
          <button className="text-purple-600 font-semibold hover:text-purple-700">
            Start Chat
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <Phone className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
          <p className="text-sm text-gray-700 mb-4">Mon-Fri, 9am-6pm EST</p>
          <p className="text-green-600 font-semibold">+1 (800) 555-1234</p>
        </div>
      </div>

      {/* Support Hours */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Support Hours</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-medium">Monday - Friday</p>
                <p>9:00 AM - 6:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Saturday</p>
                <p>10:00 AM - 4:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Sunday</p>
                <p>12:00 PM - 5:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Holidays</p>
                <p>Closed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Summary */}
      {stats.tickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-700 font-semibold mb-1">Open Tickets</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.open}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
            <p className="text-sm text-green-700 font-semibold mb-1">Resolved Tickets</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a Support Ticket</h2>

          {message && (
            <div
              className={`mb-6 flex items-center gap-2 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-green-800 font-semibold mb-2">✓ Ticket Submitted Successfully</p>
              <p className="text-green-700 text-sm">We'll get back to you within 24 hours. Check your email for updates.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  placeholder="Please describe your issue or question in detail..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
          <div className="space-y-3">
            <a
              href="/profile/about"
              className="block p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-blue-700 font-semibold"
            >
              About DynaLink Connect
            </a>
            <a
              href="/products"
              className="block p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition text-purple-700 font-semibold"
            >
              Browse Products
            </a>
            <a
              href="/orders"
              className="block p-3 rounded-lg bg-green-50 hover:bg-green-100 transition text-green-700 font-semibold"
            >
              Your Orders
            </a>
            <a
              href="/profile/promocodes"
              className="block p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition text-orange-700 font-semibold"
            >
              Promo Codes
            </a>
            <a
              href="/cart"
              className="block p-3 rounded-lg bg-pink-50 hover:bg-pink-100 transition text-pink-700 font-semibold"
            >
              Shopping Cart
            </a>
          </div>
        </div>
      </div>

      {/* Your Tickets */}
      {stats.tickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Support Tickets</h2>

          <div className="space-y-4">
            {stats.tickets.map((ticket) => (
              <div key={ticket.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        ticket.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {ticket.status === 'open' ? 'Open' : 'Resolved'}
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        ticket.priority === 'urgent'
                          ? 'bg-red-100 text-red-800'
                          : ticket.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : ticket.priority === 'low'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{ticket.message}</p>
                {ticket.response && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Response:</p>
                    <p className="text-sm text-blue-800">{ticket.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition">
              <button
                onClick={() => setActiveAccordion(activeAccordion === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition font-semibold text-gray-900"
              >
                <span className="text-left">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-blue-600 transition-transform flex-shrink-0 ${
                    activeAccordion === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeAccordion === faq.id && (
                <div className="p-5 text-gray-700 border-t border-gray-200 bg-white">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}