# Multi-Vendor Marketplace System

## Overview
DynaLink Connect now supports a complete multi-vendor marketplace where:
- Vendors can register and create their own storefronts
- Vendors manage products and set delivery zones
- Automatic delivery fee calculation based on customer address
- Commission tracking and vendor payouts

## Database Changes

### New Fields in `User` Model
- `isVendor` - Boolean flag
- `vendorName` - Unique store name (URL slug)
- `vendorDescription` - Store description  
- `vendorImage` - Store logo/image
- `storeAddress` - Physical store address
- `storeCity`, `storeState`, `storeZipCode` - Location
- `latitude`, `longitude` - Coordinates for distance calculation
- `vendorPhoneNumber` - Contact number
- `vendorVerified` - Admin approval status
- `vendorJoinedAt` - Registration timestamp
- `commissionRate` - Percentage taken by platform (default 10%)

### Updated Models

**Product** - Added vendor tracking:
```
vendorId    String?
vendor      User?    (optional for backward compat)
```

**OrderItem** - Added vendor and delivery info:
```
vendorId       String?  (which vendor supplies this item)
vendor         User?
deliveryFee    Float    (delivery charge for this item)
vendorEarnings Float    (vendor's portion after commission)
```

**Order** - Added delivery tracking:
```
customerZip  String?
deliveryFee  Float   (total delivery for order)
```

### New Models

**DeliveryZone**
```
vendorId    String   (which vendor)
zipCode     String   (service area)
city, state String?
baseFee     Float    (minimum delivery charge)
perKmFee    Float    (charge per kilometer)
maxDistance Float    (max service radius in km)
active      Boolean
```

**VendorPayout**
```
vendorId       String
amount         Float      (amount to be paid)
status         String     (pending/completed/failed)
ordersIncluded Int        (how many orders)
paymentMethod  String?    (bank transfer, etc)
transactionId  String?    (proof of payment)
processedAt    DateTime?
```

## API Routes

### Vendor Management
- `POST /api/vendor/register` - Register as vendor
- `GET /api/vendor/register` - Get vendor profile
- `POST /api/vendor/products` - Create product
- `PATCH /api/vendor/products/[id]` - Update product
- `DELETE /api/vendor/products/[id]` - Delete product
- `GET /api/vendor/products` - List vendor's products
- `GET /api/vendor/orders` - Vendor's orders for their products

### Delivery Management
- `GET /api/vendor/delivery-zones` - List zones
- `POST /api/vendor/delivery-zones` - Add zone
- `PATCH /api/vendor/delivery-zones/[id]` - Update zone
- `DELETE /api/vendor/delivery-zones/[id]` - Remove zone

### Delivery Calculation
- `POST /api/delivery/calculate` - Calculate fees

### Marketplace
- `GET /api/vendors` - List all verified vendors

## Frontend Pages

### For Vendors
- `/vendor/register` - Become a vendor form
- `/vendor/dashboard` - Vendor control panel
- `/vendor/products/[id]` - Manage products
- `/vendor/delivery-zones/[id]` - Manage delivery

### For Customers
- `/vendors` - Browse all vendors
- `/vendor/[slug]` - View vendor storefront & products
- Cart checkout with multi-vendor support

## How Delivery Fees Work

1. **Vendor Setup**: Vendor defines delivery zones by zip code
   - Base fee for the zone
   - Optional per-km charge
   - Maximum delivery distance

2. **Order Checkout**:
   - Customer enters zip code
   - System groups items by vendor
   - Calculates delivery fee per vendor:
     - Check if zone exists for customer's zip code
     - If yes: `fee = baseFee + (km * perKmFee)`
     - If no: Apply default fee (currently $50)

3. **Order Totals**:
   - Items grouped by vendor
   - Each vendor gets: `(itemPrice - commission%) + deliveryFee`
   - Platform keeps commission portion

## Usage Examples

### 1. Register as Vendor
```bash
POST /api/vendor/register
{
  "vendorName": "electronics-hub",
  "vendorDescription": "Best electronics",
  "storeAddress": "123 Market St",
  "storeCity": "San Francisco",
  "storeState": "CA",
  "storeZipCode": "94102",
  "vendorPhoneNumber": "+1-555-0123",
  "latitude": "37.7749",
  "longitude": "-122.4194"
}
```

### 2. Add Delivery Zone
```bash
POST /api/vendor/delivery-zones
{
  "zipCode": "94102",
  "city": "San Francisco",
  "state": "CA",
  "baseFee": 5,
  "perKmFee": 1,
  "maxDistance": 50
}
```

### 3. Create Product
```bash
POST /api/vendor/products
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "category": "electronics",
  "stock": 10,
  "image": "url-to-image"
}
```

### 4. Calculate Delivery
```bash
POST /api/delivery/calculate
{
  "customerZipCode": "94102",
  "items": [
    { "productId": "prod1" },
    { "productId": "prod2" }
  ]
}
```

Response:
```json
{
  "vendorFees": [
    { "vendorId": "vendor1", "fee": 10 },
    { "vendorId": "vendor2", "fee": 15 }
  ],
  "totalDeliveryFee": 25,
  "itemsByVendor": {
    "vendor1": 2,
    "vendor2": 1
  }
}
```

## Commission & Payouts

- Default commission rate: 10%
- Configurable per vendor
- Example: Item costs $100
  - Vendor earns: $90 (after 10% commission)
  - Vendor also receives delivery fee
  - Platform keeps $10

## Security Considerations

1. **Vendor Auth**: Only vendors can create/edit their own products
2. **Order Auth**: Vendors only see orders for their products
3. **Zone Auth**: Vendors only manage their own delivery zones
4. **Admin**: Can verify/reject vendors, set commission rates

## Next Steps (Optional)

1. **Real Distance Calculation**: Use Google Maps API for accurate km calculations
2. **Vendor Verification**: Admin approval workflow
3. **Automated Payouts**: Bank transfer integration for vendor payments
4. **Review System**: New ratings per vendor
5. **Multi-warehouse**: Vendors with multiple fulfillment centers
6. **Analytics**: Vendor dashboard metrics
