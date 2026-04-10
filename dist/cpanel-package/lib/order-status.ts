export const ORDER_ITEM_STATUSES = [
  'pending',
  'accepted',
  'courier_on_the_way',
  'completed',
  'declined',
  'cancelled',
] as const

export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number]

export function isOrderItemStatus(value: string): value is OrderItemStatus {
  return ORDER_ITEM_STATUSES.includes(value as OrderItemStatus)
}

export function formatOrderItemStatus(status: string) {
  switch (status) {
    case 'courier_on_the_way':
      return 'Courier On The Way'
    case 'accepted':
      return 'Accepted'
    case 'completed':
      return 'Completed'
    case 'declined':
      return 'Declined'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

export function deriveOrderStatus(itemStatuses: string[]) {
  if (!itemStatuses.length) {
    return 'pending'
  }

  if (itemStatuses.every((status) => status === 'completed')) {
    return 'completed'
  }

  if (itemStatuses.every((status) => status === 'declined')) {
    return 'declined'
  }

  if (itemStatuses.every((status) => status === 'cancelled')) {
    return 'cancelled'
  }

  if (itemStatuses.some((status) => status === 'courier_on_the_way')) {
    return 'courier_on_the_way'
  }

  if (itemStatuses.some((status) => status === 'accepted')) {
    return 'accepted'
  }

  if (itemStatuses.some((status) => status === 'pending')) {
    return 'pending'
  }

  return 'pending'
}
