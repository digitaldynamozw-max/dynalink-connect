'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'
import { AddressEntry } from '@/components/address-entry'
import { useCustomerLocationStore } from '@/lib/customer-location'

type HeroSlide = {
  id: string
  title: string
  subtitle: string
  image: string
  accent: string
  ctaLabel: string
  ctaHref: string
}

interface HomeHeroSliderProps {
  slides: HeroSlide[]
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

const QUICK_MENU = [
  { label: 'Restaurants', href: '/vendors?category=Food%20%26%20Beverage' },
  { label: 'Fashion', href: '/vendors?category=Fashion' },
  { label: 'Electronics', href: '/vendors?category=Electronics' },
  { label: 'Beauty', href: '/vendors?category=Beauty' },
  { label: 'Sports', href: '/vendors?category=Sports' },
]

export function HomeHeroSlider({
  slides,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
}: HomeHeroSliderProps) {
  const address = useCustomerLocationStore((state) => state.address)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [slides.length])

  const activeSlide = useMemo(() => slides[activeIndex] || slides[0], [activeIndex, slides])

  return (
    <section className="border-b border-[var(--border)] bg-transparent">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_MENU.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="theme-secondary-btn rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="theme-panel-strong overflow-hidden rounded-[2rem]">
          <div className="relative min-h-[560px]">
            <Image
              src={activeSlide.image}
              alt={activeSlide.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,34,43,0.9),rgba(24,34,43,0.54),rgba(45,114,133,0.28))]" />

            <div className="relative z-10 flex min-h-[560px] flex-col justify-end px-6 py-8 sm:px-8 lg:px-12">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
                  <span className={`h-2.5 w-2.5 rounded-full ${activeSlide.accent}`} />
                  Delivery Marketplace
                </div>
                <h1 className="mt-5 max-w-2xl text-4xl font-black uppercase leading-none text-white sm:text-5xl lg:text-7xl">
                  {activeSlide.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
                  {activeSlide.subtitle}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-semibold text-white backdrop-blur">
                    <Star className="h-4 w-4 fill-current text-amber-300" />
                    Top rated vendors
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-semibold text-white backdrop-blur">
                    <MapPin className="h-4 w-4 text-[#f1c38c]" />
                    {address ? `Near ${address}` : 'Add your address for closer matches'}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={activeSlide.ctaHref || primaryCtaHref}
                    className="theme-accent-btn rounded-full px-6 py-3 text-sm font-semibold"
                  >
                    {activeSlide.ctaLabel || primaryCtaLabel}
                  </Link>
                  <Link
                    href={secondaryCtaHref}
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    {secondaryCtaLabel}
                  </Link>
                </div>
              </div>

              <AddressEntry className="mt-8 max-w-4xl" />
            </div>

            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)}
                  className="absolute left-4 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-lg transition hover:bg-white"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
                  className="absolute right-4 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-lg transition hover:bg-white"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-white px-6 py-4">
            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition ${
                    index === activeIndex ? 'w-10 bg-[var(--brand-accent)]' : 'w-2.5 bg-slate-300'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">
              Set your address first to see stores closest to you before you order.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
