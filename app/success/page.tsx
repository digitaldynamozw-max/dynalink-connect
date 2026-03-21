import SuccessHandler from '@/components/success-handler'

interface SuccessPageProps {
  searchParams?: {
    orderId?: string
  }
}

export default function SuccessPage({ searchParams }: SuccessPageProps) {
  return (
    <SuccessHandler orderId={searchParams?.orderId ?? null} />
  )
}
