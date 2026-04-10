import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Store } from 'lucide-react'

export function Categories() {
  const categories = [
    {
      name: 'Electronics',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&h=700&fit=crop',
      count: 4,
    },
    {
      name: 'Books',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&h=700&fit=crop',
      count: 1,
    },
    {
      name: 'Home',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&h=700&fit=crop',
      count: 1,
    },
    {
      name: 'Sports',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&h=700&fit=crop',
      count: 1,
    },
    {
      name: 'Clothing',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&h=700&fit=crop',
      count: 1,
    },
    {
      name: 'Beauty',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&h=700&fit=crop',
      count: 1,
    },
  ]

  return (
    <section className="mb-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-ink)]">Browse Vendors by Category</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Jump straight into the stores customers are exploring most.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <div
            key={category.name}
            className="theme-panel group relative overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-44 overflow-hidden">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-xl font-bold">{category.name}</h3>
                <p className="mt-1 text-sm text-white/85">{category.count} featured vendors to explore</p>
              </div>
            </div>

            <div className="p-4">
              <Link
                href={`/vendors?category=${encodeURIComponent(category.name)}`}
                className="theme-accent-btn inline-flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
              >
                View Vendors
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
