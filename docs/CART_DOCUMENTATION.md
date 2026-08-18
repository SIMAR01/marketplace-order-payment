# Cart Management Module API Documentation

The Cart Management Module manages authenticated shopping carts. Dynamic subtotals, tax rate computations, and shipping fees are computed securely on the server upon retrieval.

## Database Schema (MongoDB / Mongoose)

```typescript
export interface ICartItem {
  product: mongoose.Types.ObjectId; // References Product Model
  quantity: number;                  // Integer, Minimum: 1
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;     // References User Model (Unique)
  items: ICartItem[];                // Array of Cart items
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Role-Based Gating
* Gated to authenticated accounts with `role: 'CUSTOMER'`.
* Requests from `PROVIDER` or `ADMIN` profiles trigger a `403 Forbidden` JSON error payload.

---

## API Endpoints

### 1. Retrieve Populated Cart
* **Route**: `GET /api/cart`
* **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Role Check**: `CUSTOMER`
* **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cart retrieved successfully",
  "data": {
    "_id": "65f2a1b0c034a78b9d000100",
    "user": "65f2a0b0c034a78b9d000001",
    "items": [
      {
        "product": {
          "_id": "65f2a2b0c034a78b9d000200",
          "title": "Sony WH-1000XM5 Wireless Headphones",
          "description": "Industry leading noise canceling headphones.",
          "price": {
            "amount": 349.99,
            "currency": "USD"
          },
          "stock": 15,
          "category": "ELECTRONICS",
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/products/sony.jpg",
              "publicId": "products/sony"
            }
          ],
          "isDeleted": false
        },
        "quantity": 2,
        "subtotal": 699.98,
        "isOutOfStock": false,
        "hasInsufficientStock": false
      }
    ],
    "totals": {
      "subtotal": 699.98,
      "shippingFee": 5.00,
      "tax": 56.00,
      "totalAmount": 760.98
    },
    "hasWarnings": false
  }
}
```

### 2. Add Item to Cart
* **Route**: `POST /api/cart`
* **Role Check**: `CUSTOMER`
* **Payload**:
```json
{
  "productId": "65f2a2b0c034a78b9d000200",
  "quantity": 1
}
```
* **Validations**:
  * Product must exist and not be soft-deleted.
  * Product stock check: `existingCartQty + requestedQty` must not exceed `product.stock`.
* **Response (200 OK)**: Returns the populated cart details.

### 3. Update Cart Item Quantity
* **Route**: `PATCH /api/cart/item`
* **Role Check**: `CUSTOMER`
* **Payload**:
```json
{
  "productId": "65f2a2b0c034a78b9d000200",
  "quantity": 3
}
```
* **Validations**:
  * Setting quantity to `0` removes the item.
  * Setting quantity higher than stock triggers a `400 Bad Request`.
* **Response (200 OK)**: Returns the populated cart details.

### 4. Remove Item from Cart
* **Route**: `DELETE /api/cart/item/:productId`
* **Role Check**: `CUSTOMER`
* **Response (200 OK)**: Returns the populated cart details.

### 5. Clear Entire Cart
* **Route**: `DELETE /api/cart`
* **Role Check**: `CUSTOMER`
* **Response (200 OK)**: Returns the populated cart details.

---

## Calculations & Dynamic Recalculations

Pricing properties are stored strictly in cents in the database to prevent float rounding errors. They are serialized into standard decimal floating values inside response outputs:
* `subtotal` = Sum of all item subtotals (`quantity * product.price.amount` in cents / 100).
* `shippingFee` = Flat `$5.00` if the cart contains at least one item; otherwise `$0.00`.
* `tax` = `8%` of the computed subtotal (`Math.round(subtotal * 0.08)` in cents / 100).
* `totalAmount` = `subtotal + shippingFee + tax`.
