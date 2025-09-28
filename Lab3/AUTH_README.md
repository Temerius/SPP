# Система аутентификации HR Management Pro

## Обзор

В приложение добавлена полноценная система аутентификации на базе JWT токенов с использованием Redis для хранения токенов. Система включает:

- **Access токены** (15 минут) - передаются через HttpOnly cookies
- **Refresh токены** (7 дней) - хранятся в Redis с TTL
- **Роли пользователей**: user, manager, admin
- **Middleware** для защиты маршрутов
- **Автоматическое обновление токенов**
- **Черный список токенов** для logout

## Архитектура

### Backend
- **auth_service.py** - сервис для работы с JWT токенами
- **auth_middleware.py** - middleware для проверки токенов
- **Модель User** - пользователи системы
- **Redis** - хранение refresh токенов и blacklist

### Frontend
- **AuthContext** - контекст аутентификации
- **ProtectedRoute** - защищенные маршруты
- **Login/Register** - компоненты аутентификации
- **HttpOnly cookies** - безопасная передача токенов

## Запуск

### 1. Запуск с Docker Compose
```bash
docker-compose up --build
```

### 2. Проверка сервисов
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Redis**: localhost:6379

## Тестовые данные

### Администратор по умолчанию
- **Email**: admin@hr.com
- **Пароль**: admin123
- **Роль**: admin

### Создание новых пользователей
Используйте форму регистрации или API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@hr.com", "password": "password123", "role": "manager"}'
```

## API Endpoints

### Аутентификация
- `POST /api/auth/login` - вход в систему
- `POST /api/auth/register` - регистрация
- `POST /api/auth/logout` - выход из системы
- `POST /api/auth/refresh` - обновление токена
- `GET /api/auth/me` - текущий пользователь
- `POST /api/auth/change-password` - смена пароля

### Защищенные маршруты
Все основные маршруты теперь защищены:

- **GET** маршруты - требуют аутентификации
- **POST/PUT/DELETE** маршруты - требуют соответствующие роли

## Роли и права доступа

### User (Пользователь)
- Просмотр данных сотрудников и проектов
- Загрузка аватаров

### Manager (Менеджер)
- Все права User
- Создание и редактирование сотрудников
- Создание и редактирование проектов
- Назначение сотрудников на проекты

### Admin (Администратор)
- Все права Manager
- Удаление (деактивация) сотрудников

## Безопасность

### Токены
- **Access токены**: короткое время жизни (15 мин)
- **Refresh токены**: длительное время жизни (7 дней)
- **HttpOnly cookies**: защита от XSS
- **SameSite**: защита от CSRF

### Redis
- Хранение refresh токенов с TTL
- Черный список отозванных токенов
- Автоматическая очистка истекших токенов

## Обработка ошибок

### 401 Unauthorized
- Автоматическое перенаправление на страницу логина
- Попытка обновления токена через refresh token

### 403 Forbidden
- Уведомление о недостаточных правах
- Перенаправление на главную страницу

## Мониторинг

### Логи
- Создание пользователей
- Входы в систему
- Ошибки аутентификации

### Redis
```bash
# Подключение к Redis
docker exec -it lab3-redis-1 redis-cli

# Просмотр ключей
KEYS *

# Просмотр TTL
TTL refresh_token:your_token_here
```

## Разработка

### Добавление новых ролей
1. Обновить enum ролей в `auth_service.py`
2. Добавить проверки в `auth_middleware.py`
3. Обновить иерархию ролей в `ProtectedRoute.js`

### Добавление защищенных маршрутов
```python
@app.route('/api/new-endpoint', methods=['GET'])
@token_required  # или @manager_required, @admin_required
def new_endpoint():
    # Доступ к request.current_user
    user_id = request.current_user['id']
    # ...
```

### Настройка CORS
Обновить настройки CORS в `app.py` для продакшена:
```python
CORS(app, supports_credentials=True, origins=['https://yourdomain.com'])
```

## Производственная настройка

### Переменные окружения
```bash
JWT_SECRET_KEY=your-very-secure-secret-key
REDIS_URL=redis://your-redis-host:6379/0
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### HTTPS
- Установить `secure=True` для cookies
- Использовать HTTPS в продакшене
- Настроить SSL сертификаты

### Мониторинг безопасности
- Логирование попыток входа
- Мониторинг подозрительной активности
- Регулярная ротация секретных ключей

## Troubleshooting

### Проблемы с cookies
- Проверить настройки CORS
- Убедиться в правильности домена
- Проверить настройки `withCredentials`

### Проблемы с Redis
```bash
# Проверить подключение
docker logs lab3-redis-1

# Очистить все токены (осторожно!)
docker exec -it lab3-redis-1 redis-cli FLUSHDB
```

### Проблемы с токенами
- Проверить время жизни токенов
- Убедиться в правильности секретного ключа
- Проверить синхронизацию времени сервера
