import jwt
import redis
import bcrypt
from datetime import datetime, timedelta
from flask import current_app
import os
import uuid

class AuthService:
    def __init__(self):
        self.redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
        self.jwt_secret = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
        self.access_token_expire = timedelta(hours=1) 
        self.refresh_token_expire = timedelta(days=7)
    
    def hash_password(self, password: str) -> str:
        """Хеширует пароль"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Проверяет пароль"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_access_token(self, user_id: int, email: str, role: str = 'user') -> str:
        """Создает access token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'role': role,
            'type': 'access',
            'exp': datetime.utcnow() + self.access_token_expire,
            'iat': datetime.utcnow(),
            'jti': str(uuid.uuid4()) 
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def create_refresh_token(self, user_id: int, email: str) -> str:
        """Создает refresh token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'refresh',
            'exp': datetime.utcnow() + self.refresh_token_expire,
            'iat': datetime.utcnow(),
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        
        try:
            ttl_seconds = int(self.refresh_token_expire.total_seconds())
            print(f"Saving refresh token to Redis with TTL: {ttl_seconds} seconds")
            result = self.redis_client.setex(
                f"refresh_token:{token}",
                ttl_seconds,
                str(user_id)
            )
            print(f"Redis setex result: {result}")
        except Exception as e:
            print(f"Redis error: {e}")
        
        return token
    
    def verify_token(self, token: str, token_type: str = 'access') -> dict:
        """Проверяет токен и возвращает payload"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            
            if payload.get('type') != token_type:
                raise jwt.InvalidTokenError('Invalid token type')
            
            if token_type == 'refresh':
                if not self.redis_client.exists(f"refresh_token:{token}"):
                    raise jwt.InvalidTokenError('Refresh token not found')
            
            return payload
        except jwt.ExpiredSignatureError:
            raise jwt.InvalidTokenError('Token has expired')
        except jwt.InvalidTokenError:
            raise jwt.InvalidTokenError('Invalid token')
    
    def revoke_refresh_token(self, token: str) -> bool:
        """Отзывает refresh token"""
        try:
            return self.redis_client.delete(f"refresh_token:{token}") > 0
        except Exception:
            return False
    
    def revoke_all_user_tokens(self, user_id: int) -> int:
        """Отзывает все токены пользователя"""
        pattern = f"refresh_token:*"
        revoked_count = 0
        
        for key in self.redis_client.scan_iter(match=pattern):
            token = key.decode('utf-8').replace('refresh_token:', '')
            try:
                payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'], options={"verify_exp": False})
                if payload.get('user_id') == user_id:
                    if self.redis_client.delete(key):
                        revoked_count += 1
            except jwt.InvalidTokenError:
                self.redis_client.delete(key)
        
        return revoked_count
    
    def blacklist_token(self, token: str, expires_at: datetime) -> bool:
        """Добавляет токен в черный список"""
        try:
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            if ttl > 0:
                self.redis_client.setex(f"blacklist:{token}", ttl, "1")
                return True
            return False
        except Exception:
            return False
    
    def is_token_blacklisted(self, token: str) -> bool:
        """Проверяет, находится ли токен в черном списке"""
        try:
            return self.redis_client.exists(f"blacklist:{token}") > 0
        except Exception:
            return False
    
    def refresh_access_token(self, refresh_token: str) -> dict:
        """Обновляет access token используя refresh token"""
        try:
            payload = self.verify_token(refresh_token, 'refresh')
            user_id = payload['user_id']
            email = payload['email']
            role = payload.get('role', 'user')
            
            new_access_token = self.create_access_token(user_id, email, role)
            
            return {
                'access_token': new_access_token,
                'token_type': 'Bearer',
                'expires_in': int(self.access_token_expire.total_seconds())
            }
        except jwt.InvalidTokenError:
            raise jwt.InvalidTokenError('Invalid refresh token')
    
    def logout(self, refresh_token: str) -> bool:
        """Выход из системы - отзывает refresh token"""
        try:
            payload = self.verify_token(refresh_token, 'refresh')

            self.revoke_refresh_token(refresh_token)
            
            return True
        except jwt.InvalidTokenError:
            return False
