'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingCart, MapPin, DollarSign } from 'lucide-react'
import { ImpersonationBanner } from '@/components/impersonation-banner'

interface VendorData {
  id: string
  vendorName: string
  vendorImage?: string
  vendorDescription?: string
  vendorJoinedAt?: Date
  storeCity?: string
  storeState?: string
  storeAddress?: string
  storeZipCode?: string
  vendorPhoneNumber?: string
  vendorVerified?: boolean
  commissionRate?: number
  isVendor?: boolean
}

interface ProductData {
  id: string
  name: string
  price: number
  stock: number
  category?: string
}

interface OrderData {
  id: string
  orderId: string
  product: ProductData
  quantity: number
  price: number
  status: string
  order?: { total?: number }
}

export default function VendorDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [products, setProducts] = useState<ProductData[]>([])
  const [orders, setOrders] = useState<OrderData[]>([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.email) {
      router.push('/auth/signin')
      return
    }

    fetchVendorData()
  }, [session?.user?.email, router])

  const fetchVendorData = async () => {
    try {
      const [vendorRes, productsRes, ordersRes] = await Promise.all([
        fetch('/api/vendor/register'),
        fetch('/api/vendor/products'),
        fetch('/api/vendor/orders')
      ])

      if (vendorRes.ok) setVendor(await vendorRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
      if (ordersRes.ok) setOrders(await ordersRes.json())
    } catch (error) {
      console.error('Failed to fetch vendor data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!vendor?.isVendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Not a Vendor</h1>
          <p className="text-gray-600 mb-6">You need to register as a vendor first.</p>
          <button
            onClick={() => router.push('/vendor/register')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Register as Vendor
          </button>
        </div>
      </div>
    )
  }

  const totalSales = orders.reduce((sum, item) => sum + (item.order?.total || 0), 0)
  const totalOrders = new Set(orders.map(item => item.orderId)).size
  const totalProducts = products.length

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpersonationBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            {vendor.vendorImage && (
              <img
                src={vendor.vendorImage}
                alt={vendor.vendorName}
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{vendor.vendorName}</h1>
              <p className="text-gray-600">{vendor.vendorDescription}</p>
              <p className="text-sm text-gray-500 mt-1">
                Joined {vendor.vendorJoinedAt ? new Date(vendor.vendorJoinedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <Package className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-10 w-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900">${totalSales.toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-purple-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Store Address</p>
                <p className="text-sm font-semibold text-gray-900">{vendor.storeCity}, {vendor.storeState}</p>
              </div>
              <MapPin className="h-10 w-10 text-red-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
              {['overview', 'products', 'orders', 'delivery', 'payouts', 'settings'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                    tab === t
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {tab === 'products' && <ProductsTab products={products} />}
            {tab === 'orders' && <OrdersTab orders={orders} />}
            {tab === 'delivery' && <DeliveryTab />}
            {tab === 'payouts' && <PayoutsTab />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'overview' && <OverviewTab vendor={vendor} products={products} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ vendor, products }: { vendor: VendorData; products: ProductData[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Store Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Address:</span> {vendor.storeAddress}</p>
            <p><span className="font-semibold">City:</span> {vendor.storeCity}, {vendor.storeState} {vendor.storeZipCode}</p>
            <p><span className="font-semibold">Phone:</span> {vendor.vendorPhoneNumber}</p>
            <p><span className="font-semibold">Status:</span> {vendor.vendorVerified ? '✓ Verified' : 'Pending verification'}</p>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Commission & Policy</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Commission Rate:</span> {vendor.commissionRate}%</p>
            <p><span className="font-semibold">Active Products:</span> {products.filter((p) => p.stock > 0).length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsTab({ products }: { products: ProductData[] }) {
  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => window.location.href = '/vendor/products/new'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-200">
                <td className="px-6 py-4">{product.name}</td>
                <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-700 mr-4">Edit</button>
                  <button className="text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrdersTab({ orders }: { orders: OrderData[] }) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [newStatus, setNewStatus] = useState('shipped')
  const [loading, setLoading] = useState(false)
  const [updatedOrders, setUpdatedOrders] = useState(orders)

  const toggleItem = (itemId: string) => {
    const updated = new Set(selectedItems)
    if (updated.has(itemId)) {
      updated.delete(itemId)
    } else {
      updated.add(itemId)
    }
    setSelectedItems(updated)
  }

  const handleBulkUpdate = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item')
      return
    }

    setLoading(true)
    try {
      const itemIds = Array.from(selectedItems)
      const itemIdToOrderId: { [key: string]: string } = {}
      updatedOrders.forEach((item) => {
        itemIdToOrderId[item.id] = item.orderId
      })

      const response = await fetch(`/api/vendor/orders/${itemIdToOrderId[itemIds[0]]}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          itemIds: itemIds
        })
      })

      if (response.ok) {
        // Update local state
        await response.json()
        setUpdatedOrders((prev) =>
          prev.map(item =>
            itemIds.includes(item.id) ? { ...item, status: newStatus } : item
          )
        )
        setSelectedItems(new Set())
        alert(`Updated ${selectedItems.size} item(s) to ${newStatus}`)
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900">{selectedItems.size} item(s) selected</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              title="Select order status"
              aria-label="Order status"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.size === updatedOrders.length && updatedOrders.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(new Set(updatedOrders.map((item) => item.id)))
                    } else {
                      setSelectedItems(new Set())
                    }
                  }}
                  className="rounded"
                  title="Select all orders"
                  aria-label="Select all orders"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Qty</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {updatedOrders.map((item) => (
              <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="rounded"
                    title={`Select order ${item.orderId.slice(0, 8)}`}
                    aria-label={`Select order ${item.orderId.slice(0, 8)}`}
                  />
                </td>
                <td className="px-6 py-4 text-sm font-mono">{item.orderId.slice(0, 8)}</td>
                <td className="px-6 py-4">{item.product.name}</td>
                <td className="px-6 py-4">{item.quantity}</td>
                <td className="px-6 py-4">${(item.price * item.quantity).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    item.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    item.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status || 'pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DeliveryTab() {
  const [zones, setZones] = useState<Array<{id: string; name: string; fee: number; zipCode?: string; city?: string; baseFee?: number; perKmFee?: number; active?: boolean}>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vendor/delivery-zones')
      .then(r => r.json())
      .then(setZones)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => window.location.href = '/vendor/delivery-zones/new'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Delivery Zone
        </button>
      </div>
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Zip Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">City</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Base Fee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Per KM</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-t border-gray-200">
                  <td className="px-6 py-4 font-mono">{zone.zipCode}</td>
                  <td className="px-6 py-4">{zone.city}</td>
                  <td className="px-6 py-4">${zone.baseFee}</td>
                  <td className="px-6 py-4">${zone.perKmFee}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      zone.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {zone.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PayoutsTab() {
  const [payoutData, setPayoutData] = useState<{payouts: Array<{id: string; amount: number; date: string; status: string}>; pendingEarnings: number; commissionRate: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    fetchPayoutData()
  }, [])

  const fetchPayoutData = async () => {
    try {
      const res = await fetch('/api/vendor/payouts')
      if (res.ok) {
        setPayoutData(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch payout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPayout = async () => {
    if (!payoutData || payoutData.pendingEarnings < 10) {
      alert('Minimum payout amount is $10')
      return
    }

    setRequesting(true)
    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'bank_transfer' })
      })

      if (res.ok) {
        const response = await res.json()
        alert(response.message)
        fetchPayoutData()
      } else {
        alert('Failed to request payout')
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
      alert('Error requesting payout')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-blue-700 font-medium mb-2">Pending Earnings</p>
          <p className="text-3xl font-bold text-blue-900">${(payoutData?.pendingEarnings || 0).toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-2">Available for payout</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-sm text-green-700 font-medium mb-2">Total Paid</p>
          <p className="text-3xl font-bold text-green-900">
            ${payoutData?.payouts
              .filter((p) => p.status === 'completed')
              .reduce((sum: number, p) => sum + p.amount, 0)
              .toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-green-600 mt-2">Completed payouts</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <p className="text-sm text-purple-700 font-medium mb-2">Commission Rate</p>
          <p className="text-3xl font-bold text-purple-900">{payoutData?.commissionRate || 0}%</p>
          <p className="text-xs text-purple-600 mt-2">Platform commission</p>
        </div>
      </div>

      {/* Request Payout Button */}
      {(payoutData?.pendingEarnings || 0) > 10 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-yellow-900">Ready for payout!</p>
            <p className="text-sm text-yellow-700">You have ${(payoutData?.pendingEarnings || 0).toFixed(2)} available</p>
          </div>
          <button
            onClick={handleRequestPayout}
            disabled={requesting}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            {requesting ? 'Processing...' : 'Request Payout'}
          </button>
        </div>
      )}

      {/* Payout History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h3>
        {payoutData?.payouts && payoutData.payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Orders</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Method</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutData.payouts.map((payout) => (
                  <tr key={payout.id} className="border-t border-gray-200">
                    <td className="px-6 py-4 text-sm">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">{payout.ordersIncluded}</td>
                    <td className="px-6 py-4 text-sm">{payout.paymentMethod || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No payouts yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <p className="text-gray-600">Coming soon: Edit store profile, commission rates, and payment details.</p>
    </div>
  )
}
