# API Documentation - Authentication Module

This document defines the REST API endpoints, payloads, response schemas, and error codes for the Authentication module.

* **Base URL**: `http://localhost:5000/api`
* **JSON format**: All request bodies must be JSON, and responses return JSON format.
* **Response Status Codes**: All API responses (both success and error) explicitly return a `statusCode` field in the JSON body.

---

## 1. Authentication Endpoints

### 1.1 User Registration
Registers a new customer, provider/seller, or administrator.

* **Endpoint**: `POST /api/auth/register`
* **Auth Required**: No

#### A. Customer Registration
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "strongpassword123",
    "role": "CUSTOMER"
  }
  ```
  *(Note: `role` defaults to `CUSTOMER` if omitted).*
* **Success Response (201 Created)**:
  * **Headers**: `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=strict`
  * **Body**:
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "User registered successfully",
      "data": {
        "user": {
          "_id": "64724a2efca31e67dbd39201",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "role": "CUSTOMER",
          "createdAt": "2026-08-18T15:45:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

#### B. Provider / Seller Registration
* **Request Body**:
  ```json
  {
    "name": "Jane Store Owner",
    "email": "jane.owner@example.com",
    "password": "strongpassword123",
    "role": "PROVIDER",
    "phone": "9876543210",
    "businessName": "Jane Enterprise Ltd"
  }
  ```
  *(Note: For `PROVIDER` role registrations, `phone` and `businessname` are mandatory).*
* **Success Response (201 Created)**:
  * **Headers**: `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=strict`
  * **Body**:
    ```json
    {
      "success": true,
      "statusCode": 201,
      "message": "User registered successfully",
      "data": {
        "user": {
          "_id": "64724a2efca31e67dbd39202",
          "name": "Jane Store Owner",
          "email": "jane.owner@example.com",
          "role": "PROVIDER",
          "phone": "9876543210",
          "businessName": "Jane Enterprise Ltd",
          "createdAt": "2026-08-18T15:45:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.2 User Login
Authenticates user credentials and opens a new Session.

* **Endpoint**: `POST /api/auth/login`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "strongpassword123"
  }
  ```
* **Success Response (200 OK)**:
  * **Headers**: `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=strict`
  * **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Logged in successfully",
      "data": {
        "user": {
          "_id": "64724a2efca31e67dbd39201",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "role": "CUSTOMER",
          "phone": null,
          "businessName": null,
          "createdAt": "2026-08-18T15:45:00.000Z"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.3 Rotate Token (Refresh Access)
Exchanges an active Refresh Token for a rotated Refresh Token and a new Access Token. Detects reuse.

* **Endpoint**: `POST /api/auth/refresh`
* **Auth Required**: No (Authenticates via refresh cookie)
* **Success Response (200 OK)**:
  * **Headers**: `Set-Cookie: refreshToken=<new-token>; HttpOnly; Secure; SameSite=strict`
  * **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Access token refreshed successfully",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
      }
    }
    ```

---

### 1.4 Get User Profile
Retrieves data of the currently logged-in user.

* **Endpoint**: `GET /api/auth/profile`
* **Auth Required**: Yes (Bearer token)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User profile retrieved successfully",
    "data": {
      "user": {
        "_id": "64724a2efca31e67dbd39201",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "CUSTOMER",
        "phone": null,
        "businessName": null,
        "createdAt": "2026-08-18T15:45:00.000Z",
        "updatedAt": "2026-08-18T15:45:00.000Z"
      }
    }
  }
  ```

---

### 1.5 User Logout
Terminates the current login Session and invalidates the token.

* **Endpoint**: `POST /api/auth/logout`
* **Auth Required**: Yes (Bearer token)
* **Headers**: `Authorization: Bearer <accessToken>`
* **Success Response (200 OK)**:
  * **Headers**: Clears `refreshToken` cookie.
  * **Body**:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Logged out successfully",
      "data": {}
    }
    ```

---

## 2. Global Error Payload Structure

All API validation and processing failures are formatted uniformly with explicit `statusCode` response parameters:

### 2.1 Schema validation error (400 Bad Request)
Returned when request parameters fail Zod validation schema bounds.
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

### 2.2 Unauthorized error (401 Unauthorized)
Returned when credentials, access tokens, or refresh tokens are missing, invalid, or expired.
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Token has expired",
  "errors": []
}
```

### 2.3 Forbidden error (403 Forbidden)
Returned when the authenticated user does not possess sufficient role permissions.
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied: insufficient permissions.",
  "errors": []
}
```

### 2.4 Conflict error (409 Conflict)
Returned when a database unique constraint fails.
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Email already exists.",
  "errors": []
}
```
