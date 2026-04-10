'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, Clock, LifeBuoy, Mail, MessageSquare, Phone, Send } from 'lucide-react'
import { ProfileEmptyState, ProfileMessage, ProfilePageShell, ProfilePanel, ProfileStatCard } from '@/components/profile-ui'

interface SupportTicket {
  id: string
  subject: string
  message: string
  status: string
  priority: string
  response: string | null
  createdAt: string
}

interface SupportStats {
  tickets: SupportTicket[]
  open: number
  resolved: number
}

export default function Support() {
  const [stats, setStats] = useState<SupportStats | null>(null)
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
      answer: 'Use the security panel on your main account overview page and update the password from there.',
    },
    {
      id: 2,
      question: 'How can I update my profile picture?',
      answer: 'Open the overview page in My Account and use the upload action inside the profile summary card.',
    },
    {
      id: 3,
      question: 'What can I do with promo codes?',
      answer: 'Promo codes give discounts during checkout. Your active offers are listed in the Promo Codes section.',
    },
    {
      id: 4,
      question: 'How does the referral program work?',
      answer: 'Share your invite link or email a friend directly. When they complete the referral flow, your reward is added.',
    },
  ]

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/profile/support')
        if (!res.ok) throw new Error('Failed to fetch tickets')
        const data = await res.json()
        setStats(data)
      } catch {
        setError('Failed to load support tickets')
      } finally {
        setLoading(false)
      }
    }

    void fetchTickets()
  }, [])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject || !formData.message) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/profile/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to submit ticket')
      setSubmitted(true)
      setFormData({ subject: '', message: '', priority: 'normal' })

      const refreshRes = await fetch('/api/profile/support')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setStats(data)
      }

      window.setTimeout(() => setSubmitted(false), 3000)
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit ticket.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading support...</div>
  }

  if (!stats) {
    return <ProfileEmptyState title="Support unavailable" description={error || 'We could not load your support workspace.'} />
  }

  return (
    <ProfilePageShell
      eyebrow="Support"
      title="Support & Help"
      description="Reach the team, submit tickets, and browse the most common help topics in one place."
    >
      {message ? <ProfileMessage type={message.type} text={message.text} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProfileStatCard label="Email Support" value="24h" helper="Average first response window." accent="blue" icon={<Mail className="h-5 w-5" />} />
        <ProfileStatCard label="Open Tickets" value={stats.open} helper="Issues still awaiting a final answer." accent="orange" icon={<LifeBuoy className="h-5 w-5" />} />
        <ProfileStatCard label="Resolved Tickets" value={stats.resolved} helper="Tickets that have already been closed." accent="emerald" icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.9fr]">
        <ProfilePanel title="Submit a Support Ticket" description="Share the issue clearly and the team can pick it up faster.">
          {submitted ? (
            <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 p-5 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-2.5 text-sm font-semibold text-emerald-900">Ticket submitted successfully</p>
              <p className="mt-1 text-xs text-emerald-700">We&apos;ll get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Subject</span>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="How can we help?"
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Priority</span>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleFormChange}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Message</span>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  placeholder="Please describe the issue in detail."
                  rows={5}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit ticket'}
              </button>
            </form>
          )}
        </ProfilePanel>

        <div className="space-y-6">
          <ProfilePanel title="Contact Options" description="Use the support channel that best matches the urgency of your issue.">
            <div className="space-y-2.5">
              <div className="rounded-[1rem] bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Email Support</p>
                    <p className="text-sm text-slate-500">support@dynalinkconnect.co.zw</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1rem] bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-violet-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Live Chat</p>
                    <p className="text-sm text-slate-500">Fastest for active delivery or order questions.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1rem] bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Phone Support</p>
                    <p className="text-sm text-slate-500">+263719968771</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1rem] bg-amber-50 p-3 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-amber-700">
                  <Clock className="h-4 w-4" />
                  Typical hours
                </div>
                <p className="mt-2">Monday-Friday 9:00 AM - 6:00 PM EST. Weekend coverage is reduced.</p>
              </div>
            </div>
          </ProfilePanel>

          <ProfilePanel title="FAQ" description="Quick answers to the things customers ask most often.">
            <div className="space-y-2.5">
              {faqs.map((faq) => (
                <div key={faq.id} className="overflow-hidden rounded-[1rem] border border-slate-200">
                  <button
                    onClick={() => setActiveAccordion(activeAccordion === faq.id ? null : faq.id)}
                    className="flex w-full items-center justify-between bg-slate-50 px-3.5 py-3 text-left text-sm font-semibold text-slate-900"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`h-5 w-5 text-orange-500 transition-transform ${activeAccordion === faq.id ? 'rotate-180' : ''}`} />
                  </button>
                  {activeAccordion === faq.id ? <div className="bg-white px-3.5 py-3 text-xs leading-5 text-slate-600">{faq.answer}</div> : null}
                </div>
              ))}
            </div>
          </ProfilePanel>
        </div>
      </div>

      {stats.tickets.length > 0 ? (
        <ProfilePanel title="Your Tickets" description="Recent issues, statuses, and any responses from the team.">
          <div className="space-y-3">
            {stats.tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-[1rem] border border-slate-200 p-4">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{ticket.subject}</h3>
                    <p className="mt-1 text-xs text-slate-500">Created {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {ticket.status === 'open' ? 'Open' : 'Resolved'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {ticket.priority}
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 text-xs leading-5 text-slate-700">{ticket.message}</p>
                {ticket.response ? (
                  <div className="mt-3 rounded-[1rem] border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                    <p className="font-semibold">Response</p>
                    <p className="mt-1 leading-5">{ticket.response}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </ProfilePanel>
      ) : (
        <ProfileEmptyState title="No support tickets yet" description="When you submit your first support request, the conversation history will appear here." />
      )}

      {message?.type === 'error' && !submitted ? (
        <div className="inline-flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />
          {message.text}
        </div>
      ) : null}
    </ProfilePageShell>
  )
}
