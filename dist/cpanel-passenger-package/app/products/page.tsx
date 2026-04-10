import ProductsList from '@/components/products-list'

interface ProductsPageProps {
  searchParams?: Promise<{ category?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category } = (await searchParams) ?? {}

  return <ProductsList category={category} />
}
