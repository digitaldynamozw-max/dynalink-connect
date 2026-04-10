import { ensureSiteSettings } from '@/lib/admin/site-settings'
import { HomeHeroSlider } from '@/components/home-hero-slider'

const heroSlides = [
  {
    id: 'flame',
    title: 'Flame Grilled Favourites',
    subtitle: 'Restaurants, quick meals, and top local stores delivered from the vendors closest to your address.',
    image:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1800&q=80',
    accent: 'bg-orange-400',
    ctaLabel: 'Order Nearby Stores',
    ctaHref: '/vendors?category=Food%20%26%20Beverage',
  },
  {
    id: 'fashion',
    title: 'Fresh Fits and Daily Picks',
    subtitle: 'Discover trending fashion, beauty, and lifestyle stores with one fast-moving marketplace menu.',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=80',
    accent: 'bg-pink-400',
    ctaLabel: 'Explore Fashion Stores',
    ctaHref: '/vendors?category=Fashion',
  },
  {
    id: 'tech',
    title: 'Hot Tech Near Your Area',
    subtitle: 'Browse electronics and gadget vendors with location-first recommendations before you add anything to cart.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=80',
    accent: 'bg-sky-400',
    ctaLabel: 'Shop Electronics',
    ctaHref: '/vendors?category=Electronics',
  },
]

export async function Hero() {
  const settings = await ensureSiteSettings()

  return (
    <HomeHeroSlider
      slides={heroSlides}
      primaryCtaLabel={settings.primaryCtaLabel || 'Explore Vendors'}
      primaryCtaHref={settings.primaryCtaHref || '/vendors'}
      secondaryCtaLabel={settings.secondaryCtaLabel || 'Become a Vendor'}
      secondaryCtaHref={settings.secondaryCtaHref || '/vendor/register'}
    />
  )
}
