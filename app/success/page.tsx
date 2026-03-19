import SuccessHandler from '@/components/success-handler'

interface SuccessPageProps {
  searchParams?: {
    orderId?: string
    session_id?: string
  }
}

export default function SuccessPage({ searchParams }: SuccessPageProps) {
  return (
    <SuccessHandler orderId={searchParams?.orderId ?? null} sessionId={searchParams?.session_id ?? null} />
  )
}
