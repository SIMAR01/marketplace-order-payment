AUTHENTICATION FLOW
===================

The application uses JWT-based dual-token authentication:

1. Access Token
   - JWT
   - Lifetime: 15 minutes
   - Stored in frontend memory
   - Sent using Authorization: Bearer <token>
   - Used for protected API requests

2. Refresh Token
   - Lifetime: 7 days
   - Stored in HttpOnly cookie
   - Not accessible through JavaScript
   - Used to generate a new Access Token
   - Rotated after every successful refresh


1. REGISTRATION
===============

Client
  |
  | POST /api/auth/register
  v
Validate request using Zod
  |
  v
Check email uniqueness
  |
  v
Hash password using bcrypt
  |
  v
Create User
  |
  v
Generate Access Token + Refresh Token
  |
  v
Store hashed Refresh Token in Session
  |
  v
Set Refresh Token as HttpOnly cookie
  |
  v
Return Access Token + User


2. LOGIN
========

Client
  |
  | POST /api/auth/login
  v
Validate request
  |
  v
Find user by email
  |
  v
Compare password using bcrypt
  |
  v
Generate Access Token + Refresh Token
  |
  v
Create Session with hashed Refresh Token
  |
  v
Set HttpOnly Refresh Token cookie
  |
  v
Return Access Token + User


Invalid email/password:
    -> 401 Unauthorized

Use a generic message such as:
    "Invalid email or password"

This prevents account enumeration.


3. PROTECTED API
================

Client
  |
  | Authorization: Bearer <accessToken>
  v
verifyJWT middleware
  |
  +-- Invalid/Expired Token
  |       |
  |       v
  |     401
  |
  +-- Valid Token
          |
          v
      Find User
          |
          v
      req.user
          |
          v
      Controller


4. ROLE AUTHORIZATION
=====================

After verifyJWT:

    verifyJWT
       |
       v
    adminOnly
       |
       +-- role !== ADMIN --> 403 Forbidden
       |
       +-- role === ADMIN --> Controller

Authentication = Who is the user?

Authorization = What can the user access?


5. ACCESS TOKEN REFRESH
=======================

When Access Token expires:

API Request
    |
    v
401 Unauthorized
    |
    v
Frontend calls POST /api/auth/refresh
    |
    v
Browser sends HttpOnly Refresh Token cookie
    |
    v
Backend verifies Refresh Token
    |
    v
Find and validate Session
    |
    +-- Invalid/Revoked
    |       |
    |       v
    |      401
    |
    +-- Valid
            |
            v
      Generate new Access Token
            |
            v
      Generate new Refresh Token
            |
            v
      Update Session
            |
            v
      Set new HttpOnly cookie
            |
            v
      Return new Access Token
            |
            v
      Retry original request


6. REFRESH TOKEN ROTATION
=========================

Every successful refresh invalidates the previous Refresh Token.

Example:

    Token A
       |
    Refresh
       |
       v
    Token B
       |
    Refresh
       |
       v
    Token C

Only the latest token is valid.

If an already-used Refresh Token is reused, the session should be revoked
and the request should return 401 Unauthorized.


7. LOGOUT
=========

POST /api/auth/logout

    |
    v
Read Refresh Token cookie
    |
    v
Revoke current Session
    |
    v
Clear Refresh Token cookie
    |
    v
Frontend removes Access Token from memory


8. LOGOUT FROM ALL DEVICES
==========================

POST /api/auth/logout-all

    |
    v
Revoke all sessions belonging to the user
    |
    v
All Refresh Tokens become invalid


9. SESSION MODEL
================

Instead of storing a single Refresh Token inside User, use a separate
Session collection.

Session:
    - userId
    - refreshTokenHash
    - userAgent
    - ipAddress
    - expiresAt
    - revokedAt
    - createdAt

This allows the same user to stay logged in on multiple devices and
allows individual sessions to be revoked.


10. SECURITY MEASURES
=====================

- Passwords hashed using bcrypt.
- Access Token is short-lived.
- Refresh Token stored in HttpOnly cookie.
- Access Token not stored in localStorage.
- Refresh Tokens are hashed before database storage.
- Refresh Token rotation is enabled.
- Refresh Token reuse is detected.
- Sessions can be revoked.
- Zod validates authentication requests.
- Admin routes use role-based authorization.
- Generic login errors prevent account enumeration.
- Secure cookies are enabled in production.
- CORS allows only the configured frontend origin.
- Authentication endpoints should have rate limiting.


11. AUTHENTICATION ENDPOINTS
============================

POST /api/auth/register
    -> Register new user

POST /api/auth/login
    -> Login user

POST /api/auth/refresh
    -> Generate new Access Token and rotate Refresh Token

POST /api/auth/logout
    -> Logout current session

POST /api/auth/logout-all
    -> Logout from all devices

GET /api/auth/me
    -> Get currently authenticated user


12. IMPORTANT STATUS CODES
==========================

201 -> Registration successful

200 -> Login / Refresh successful

204 -> Logout successful

400 -> Invalid request data

401 -> Not authenticated / Invalid token / Invalid credentials

403 -> Authenticated but not authorized

409 -> Duplicate email

500 -> Unexpected server error


AUTHENTICATION SUMMARY
======================

                LOGIN
                  |
        +---------+---------+
        |                   |
        v                   v
  Access Token        Refresh Token
   15 minutes            7 days
        |                   |
        v                   v
  Frontend Memory     HttpOnly Cookie
        |                   |
        v                   v
 Protected APIs       /auth/refresh
                            |
                            v
                    Token Rotation
                            |
                            v
                    New Access Token


The Access Token is used for API authorization.
The Refresh Token is used only to obtain a new Access Token.