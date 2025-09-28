# Архитектура системы аутентификации

## Схема потока аутентификации

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │     Redis       │
│   (React)       │    │   (Flask)       │    │   (Token Store) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. POST /auth/login   │                       │
         │ ──────────────────────►                       │
         │                       │                       │
         │                       │ 2. Verify password    │
         │                       │ 3. Generate tokens    │
         │                       │                       │
         │                       │ 4. Store refresh token│
         │                       │ ──────────────────────►
         │                       │                       │
         │ 5. Set HttpOnly cookies│                       │
         │ ◄──────────────────────                       │
         │                       │                       │
         │ 6. API requests       │                       │
         │ (with cookies)        │                       │
         │ ──────────────────────►                       │
         │                       │                       │
         │                       │ 7. Verify access token│
         │                       │                       │
         │ 8. Return data        │                       │
         │ ◄──────────────────────                       │
         │                       │                       │
         │                       │ 9. Token expired?     │
         │                       │ ──────────────────────►
         │                       │                       │
         │                       │ 10. Refresh tokens    │
         │                       │ ◄──────────────────────
         │                       │                       │
         │ 11. New access token  │                       │
         │ ◄──────────────────────                       │
```

## Компоненты системы

### Backend Components

#### 1. AuthService (`auth_service.py`)
```
┌─────────────────────────────────────────┐
│              AuthService                │
├─────────────────────────────────────────┤
│ • hash_password()                       │
│ • verify_password()                     │
│ • create_access_token()                 │
│ • create_refresh_token()                │
│ • verify_token()                        │
│ • refresh_access_token()                │
│ • logout()                              │
│ • blacklist_token()                     │
│ • revoke_all_user_tokens()              │
└─────────────────────────────────────────┘
```

#### 2. Auth Middleware (`auth_middleware.py`)
```
┌─────────────────────────────────────────┐
│            Auth Middleware              │
├─────────────────────────────────────────┤
│ • @token_required                       │
│ • @role_required(role)                  │
│ • @admin_required                       │
│ • @manager_required                     │
│ • @optional_auth                        │
└─────────────────────────────────────────┘
```

#### 3. User Model
```
┌─────────────────────────────────────────┐
│              User Model                 │
├─────────────────────────────────────────┤
│ • id (Primary Key)                      │
│ • email (Unique)                        │
│ • password_hash                         │
│ • role (user/manager/admin)             │
│ • is_active                             │
│ • created_at                            │
│ • last_login                            │
└─────────────────────────────────────────┘
```

### Frontend Components

#### 1. AuthContext
```
┌─────────────────────────────────────────┐
│            AuthContext                  │
├─────────────────────────────────────────┤
│ • user state                            │
│ • loading state                         │
│ • login()                               │
│ • register()                            │
│ • logout()                              │
│ • changePassword()                      │
│ • checkAuth()                           │
└─────────────────────────────────────────┘
```

#### 2. Protected Route
```
┌─────────────────────────────────────────┐
│         ProtectedRoute                  │
├─────────────────────────────────────────┤
│ • Check authentication                  │
│ • Check role permissions                │
│ • Redirect to login if needed           │
│ • Show loading spinner                  │
└─────────────────────────────────────────┘
```

## Поток данных

### 1. Логин
```
User Input → Login Form → AuthAPI.login() → 
Backend Login → Verify Password → Generate Tokens → 
Set Cookies → Update Context → Redirect to Dashboard
```

### 2. API Request
```
Component → API Call → Axios Interceptor → 
Backend Middleware → Verify Token → Check Blacklist → 
Process Request → Return Response
```

### 3. Token Refresh
```
401 Response → Refresh Token Request → 
Verify Refresh Token → Generate New Access Token → 
Update Cookie → Retry Original Request
```

### 4. Logout
```
Logout Button → AuthAPI.logout() → 
Backend Logout → Revoke Refresh Token → 
Clear Cookies → Clear Context → Redirect to Login
```

## Безопасность

### Token Security
- **Access Tokens**: 15 minutes, stored in HttpOnly cookies
- **Refresh Tokens**: 7 days, stored in Redis with TTL
- **JWT Secret**: Environment variable, strong random key
- **Token Blacklisting**: Revoked tokens stored in Redis

### Cookie Security
- **HttpOnly**: Prevents XSS attacks
- **SameSite**: Prevents CSRF attacks
- **Secure**: HTTPS only (production)
- **Domain**: Restricted to application domain

### Redis Security
- **TTL**: Automatic token expiration
- **Blacklist**: Revoked token tracking
- **Isolation**: Separate database for tokens

## Роли и разрешения

### Role Hierarchy
```
Admin (Level 3)
├── All Manager permissions
└── Delete employees

Manager (Level 2)
├── All User permissions
├── Create/Edit employees
├── Create/Edit projects
└── Assign employees to projects

User (Level 1)
├── View employees
├── View projects
└── Upload avatars
```

### Permission Matrix
| Action | User | Manager | Admin |
|--------|------|---------|-------|
| View Data | ✓ | ✓ | ✓ |
| Create Employee | ✗ | ✓ | ✓ |
| Edit Employee | ✗ | ✓ | ✓ |
| Delete Employee | ✗ | ✗ | ✓ |
| Create Project | ✗ | ✓ | ✓ |
| Assign to Project | ✗ | ✓ | ✓ |

## Мониторинг и логирование

### Security Events
- Failed login attempts
- Token refresh attempts
- Permission denied events
- Suspicious activity patterns

### Performance Metrics
- Token generation time
- Redis operation latency
- Authentication success rate
- Token refresh frequency

## Масштабирование

### Horizontal Scaling
- Stateless JWT tokens
- Redis cluster for token storage
- Load balancer for backend services
- CDN for frontend assets

### Caching Strategy
- User data caching
- Permission caching
- Token validation caching
- Session state caching
