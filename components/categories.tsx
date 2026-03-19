export function Categories() {
  const categories = [
    { name: 'Electronics', image: '/category-electronics.svg', count: 4 },
    { name: 'Books', image: '/category-books.svg', count: 1 },
    { name: 'Home', image: '/category-home.svg', count: 1 },
    { name: 'Sports', image: '/category-sports.svg', count: 1 }
  ]

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Shop by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map(category => (
          <a
            key={category.name}
            href={`/products?category=${category.name}`}
            className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
                <p className="text-sm">{category.count} products</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}