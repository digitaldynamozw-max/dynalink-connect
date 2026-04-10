import { Award, Shield, Sparkles, Truck, Users, Zap } from 'lucide-react'
import { ProfilePageShell, ProfilePanel, ProfileStatCard } from '@/components/profile-ui'

export default function About() {
  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Fast marketplace flows',
      description: 'A cleaner way to discover stores, place orders, and track delivery updates.',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Community powered',
      description: 'Customers, vendors, and delivery operations all connect through one shared platform.',
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: 'Delivery focused',
      description: 'Store discovery and checkout are built around fast fulfillment, not just product browsing.',
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: 'Quality storefronts',
      description: 'The marketplace is built to spotlight trusted, high-performing vendors.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure by design',
      description: 'Account details, checkout flows, and updates are handled with a security-first mindset.',
    },
  ]

  return (
    <ProfilePageShell
      eyebrow="About"
      title="About DynaLink Connect"
      description="A quick look at the marketplace vision, the operating model behind it, and the values shaping the customer experience."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ProfileStatCard label="Marketplace Model" value="Multi-vendor" helper="Built for stores, customers, and delivery operations." accent="blue" />
        <ProfileStatCard label="Customer Focus" value="Fast discovery" helper="Location-aware shopping and clearer store-first browsing." accent="orange" />
        <ProfileStatCard label="Experience Goal" value="Reliable delivery" helper="The product experience is organized around fulfillment." accent="emerald" />
        <ProfileStatCard label="Platform Direction" value="Operational clarity" helper="Cleaner dashboards, better tracking, less friction." accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ProfilePanel title="What The Platform Is Built For" description="DynaLink Connect is evolving into a more delivery-native, store-first marketplace.">
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              The goal is to make ordering feel less like browsing a generic catalog and more like discovering real local stores,
              menus, and delivery-ready offers that fit the customer&apos;s context.
            </p>
            <p>
              That means better vendor storefronts, clearer product options, stronger account workflows, and an experience that helps
              customers move from discovery to checkout with less friction.
            </p>
            <p>
              The account area you&apos;re using now is part of that shift: one unified control center instead of a group of unrelated pages.
            </p>
          </div>
        </ProfilePanel>

        <ProfilePanel title="Core Values" description="The operating principles behind the current refresh.">
          <div className="space-y-3">
            <div className="rounded-[1.25rem] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Customer-first clarity</p>
              <p className="mt-1 text-sm text-slate-600">Make decisions that reduce confusion and make ordering feel easier.</p>
            </div>
            <div className="rounded-[1.25rem] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Operational trust</p>
              <p className="mt-1 text-sm text-slate-600">Design experiences that respect real store and delivery workflows.</p>
            </div>
            <div className="rounded-[1.25rem] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Continuous improvement</p>
              <p className="mt-1 text-sm text-slate-600">Iterate on the platform with visible quality gains across every major page.</p>
            </div>
          </div>
        </ProfilePanel>
      </div>

      <ProfilePanel title="Why It Matters" description="The platform experience should feel cohesive from home page to account settings.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex rounded-2xl bg-orange-50 p-3 text-orange-600">{feature.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </ProfilePanel>

      <ProfilePanel>
        <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a,#1e293b,#334155)] p-6 text-white sm:p-8">
          <div className="flex items-center gap-3 text-orange-300">
            <Sparkles className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em]">Current Direction</p>
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">A cleaner marketplace, one connected workflow.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The latest updates are moving the product toward a more polished delivery marketplace: stronger storefronts, better product options,
            improved discovery, and now a redesigned account area that finally matches the rest of the platform momentum.
          </p>
        </div>
      </ProfilePanel>
    </ProfilePageShell>
  )
}
