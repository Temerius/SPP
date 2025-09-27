from functools import wraps
from flask import request, jsonify, make_response
from auth_service import AuthService
import jwt

auth_service = AuthService()

def token_required(f):
    """Декоратор для проверки JWT токена"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Получаем токен из cookie
        token = request.cookies.get('access_token')
        
        if not token:
            return make_response(
                jsonify({'message': 'Access token is missing'}), 
                401
            )
        
        try:
            # Проверяем, не в черном списке ли токен
            if auth_service.is_token_blacklisted(token):
                return make_response(
                    jsonify({'message': 'Token has been revoked'}), 
                    401
                )
            
            # Проверяем токен
            data = auth_service.verify_token(token, 'access')
            current_user_id = data['user_id']
            current_user_email = data['email']
            current_user_role = data.get('role', 'user')
            
            # Добавляем информацию о пользователе в request
            request.current_user = {
                'id': current_user_id,
                'email': current_user_email,
                'role': current_user_role
            }
            
        except jwt.InvalidTokenError as e:
            return make_response(
                jsonify({'message': str(e)}), 
                401
            )
        
        return f(*args, **kwargs)
    
    return decorated

def role_required(required_role):
    """Декоратор для проверки роли пользователя"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return make_response(
                    jsonify({'message': 'User not authenticated'}), 
                    401
                )
            
            user_role = request.current_user.get('role', 'user')
            
            # Простая иерархия ролей: admin > manager > user
            role_hierarchy = {'user': 1, 'manager': 2, 'admin': 3}
            
            user_role_level = role_hierarchy.get(user_role, 0)
            required_role_level = role_hierarchy.get(required_role, 0)
            
            if user_role_level < required_role_level:
                return make_response(
                    jsonify({'message': 'Insufficient permissions'}), 
                    403
                )
            return f(*args, **kwargs)
        
        return decorated
    return decorator

def admin_required(f):
    """Декоратор для проверки прав администратора"""
    return role_required('admin')(f)

def manager_required(f):
    """Декоратор для проверки прав менеджера"""
    return role_required('manager')(f)

def optional_auth(f):
    """Декоратор для опциональной аутентификации"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('access_token')
        
        if token:
            try:
                if not auth_service.is_token_blacklisted(token):
                    data = auth_service.verify_token(token, 'access')
                    request.current_user = {
                        'id': data['user_id'],
                        'email': data['email'],
                        'role': data.get('role', 'user')
                    }
                else:
                    request.current_user = None
            except jwt.InvalidTokenError:
                request.current_user = None
        else:
            request.current_user = None
        
        return f(*args, **kwargs)
    
    return decorated
