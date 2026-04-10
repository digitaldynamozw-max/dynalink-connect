import SuccessHandler from '@/components/success-handler'

interface SuccessPageProps {
  searchParams?: Promise<{
    orderId?: string
  }>
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { orderId } = (await searchParams) ?? {}

  return (
    <SuccessHandler orderId={orderId ?? null} />
  )
}
