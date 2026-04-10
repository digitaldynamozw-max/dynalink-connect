'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Clock3, Mail, MapPin, MessageSquare, Receipt, Smartphone, TriangleAlert } from 'lucide-react'
import { ProfileEmptyState, ProfilePageShell, ProfilePanel } from '@/components/profile-ui'

type DeliveryNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  read: boolean
  type: string
  channel?: string
  deliveryStatus?: string
  resolutionStatus?: string
}

type DeliveryNotificationPreferences = {
  riderAssigned: string[]
  deliveryStarted: string[]
  lateDelivery: string[]
  deliveryCompleted: string[]
  deliveryException: string[]
}

function iconForType(type: string) {
  if (type === 'order_receipt') return <Receipt className="h-4 w-4 text-emerald-600" />
  if (type === 'late_delivery') return <Clock3 className="h-4 w-4 text-amber-600" />
  if (type === 'delivery_exception') return <TriangleAlert className="h-4 w-4 text-red-600" />
  return <MapPin className="h-4 w-4 text-blue-600" />
}

export default function ProfileNotificationsPage() {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([])
  const [preferences, setPreferences] = useState<DeliveryNotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/profile/notifications')
        if (response.ok) {
          const payload = (await response.json()) as {
            notifications: DeliveryNotification[]
            preferences: DeliveryNotificationPreferences
          }
          setNotifications(payload.notifications)
          setPreferences(payload.preferences)
          await fetch('/api/profile/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markRead: true }),
          })
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  async function togglePreference(key: keyof DeliveryNotificationPreferences, channel: string) {
    if (!preferences) return
    const currentChannels = preferences[key] || []
    const nextChannels = currentChannels.includes(channel)
      ? currentChannels.filter((value) => value !== channel)
      : [...currentChannels, channel]
    const nextPreferences = { ...preferences, [key]: nextChannels.length ? nextChannels : ['in_app'] }
    setPreferences(nextPreferences)
    setSaving(true)

    try {
      await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markRead: false,
          preferences: nextPreferences,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  const preferenceRows: Array<{ key: keyof DeliveryNotificationPreferences; label: string }> = [
    { key: 'riderAssigned', label: 'Rider assigned' },
    { key: 'deliveryStarted', label: 'Delivery started' },
    { key: 'lateDelivery', label: 'Late delivery' },
    { key: 'deliveryCompleted', label: 'Delivery completed' },
    { key: 'deliveryException', label: 'Delivery exceptions' },
  ]

  const channelMeta = [
    { key: 'in_app', label: 'In-app', icon: Bell },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'sms', label: 'SMS', icon: Smartphone },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  ]

  return (
    <ProfilePageShell
      eyebrow="Notification Center"
      title="Notifications And Receipts"
      description="Track rider updates, delays, delivery exceptions, and order receipts in one cleaner activity stream."
    >
      <ProfilePanel>
        <div className="flex items-center gap-2.5">
          <Bell className="h-5 w-5 text-orange-500" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Live alerts and receipts</h2>
            <p className="mt-1 text-xs text-slate-500">Choose where updates should reach you and review delivery activity alongside order receipts.</p>
          </div>
        </div>

        {preferences ? (
          <div className="mt-4 rounded-[1.15rem] border border-amber-100 bg-amber-50/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold text-slate-900">Notification Channels</h2>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Choose where delivery updates should be logged for you. External channels are recorded for handoff.
                </p>
              </div>
              {saving ? <span className="text-[11px] font-medium text-blue-600">Saving...</span> : null}
            </div>
            <div className="mt-3 space-y-2.5">
              {preferenceRows.map((row) => (
                <div key={row.key} className="rounded-[1rem] bg-white p-2.5 ring-1 ring-slate-200">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs font-medium text-slate-800">{row.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {channelMeta.map((channel) => {
                        const Icon = channel.icon
                        const active = preferences[row.key]?.includes(channel.key)
                        return (
                          <button
                            key={`${row.key}-${channel.key}`}
                            onClick={() => void togglePreference(row.key, channel.key)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {channel.label}
                            {active ? <Check className="h-3 w-3" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="mt-4">
            <ProfileEmptyState title="No delivery notifications yet" description="Once stores and riders send updates, they’ll appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-[1rem] border border-slate-200 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{iconForType(notification.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      {!notification.read ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">New</span>
                      ) : null}
                      {notification.resolutionStatus === 'resolved' ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Resolved</span>
                      ) : null}
                      {notification.channel && notification.channel !== 'in_app' ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {notification.channel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                    {notification.deliveryStatus ? (
                      <p className="mt-1 text-[10px] font-medium text-slate-500">Status: {notification.deliveryStatus}</p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfilePanel>
    </ProfilePageShell>
  )
}
