import React, { useState, useEffect } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import websocketService from '../services/websocket';

const OnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Проверяем, что WebSocket сервис доступен
    if (!websocketService) {
      console.warn('WebSocket service not available');
      return;
    }

    // Подписываемся на события WebSocket
            const handleUserOnline = (data) => {
              setOnlineUsers(prev => {
                // Убираем дубликаты по user_id
                const filtered = prev.filter(user => user.user_id !== data.user_id);
                return [...filtered, data];
              });
            };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => prev.filter(user => user.user_id !== data.user_id));
    };

            const handleActiveUsers = (users) => {
              // Убираем дубликаты по user_id
              const uniqueUsers = users.reduce((acc, user) => {
                const existingIndex = acc.findIndex(u => u.user_id === user.user_id);
                if (existingIndex === -1) {
                  acc.push(user);
                } else {
                  // Обновляем существующего пользователя
                  acc[existingIndex] = user;
                }
                return acc;
              }, []);
              setOnlineUsers(uniqueUsers);
            };

    const handleConnectionStatus = () => {
      try {
        setIsConnected(websocketService.getConnectionStatus());
      } catch (error) {
        console.warn('Failed to get WebSocket connection status:', error);
        setIsConnected(false);
      }
    };

    // Подписываемся на события
    websocketService.on('user_online', handleUserOnline);
    websocketService.on('user_offline', handleUserOffline);
    websocketService.on('active_users', handleActiveUsers);

    // Проверяем статус подключения каждые 5 секунд
    const statusInterval = setInterval(handleConnectionStatus, 5000);

    return () => {
      websocketService.off('user_online', handleUserOnline);
      websocketService.off('user_offline', handleUserOffline);
      websocketService.off('active_users', handleActiveUsers);
      clearInterval(statusInterval);
    };
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'manager':
        return 'bg-blue-500';
      case 'user':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'User';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="relative">
      {/* Кнопка показа онлайн пользователей */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        title={`${onlineUsers.length} users online`}
      >
        <div className="flex items-center space-x-1">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <Users className="w-4 h-4 text-gray-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {onlineUsers.length}
        </span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </button>

      {/* Детальная информация о пользователях */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Online Users ({onlineUsers.length})
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {onlineUsers.length > 0 ? (
              <div className="p-4 space-y-3">
                {onlineUsers.map((user, index) => (
                  <div
                    key={user.user_id || index}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    {/* Аватар пользователя */}
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.email ? user.email[0].toUpperCase() : 'U'}
                        </span>
                      </div>
                      {/* Индикатор онлайн */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    {/* Информация о пользователе */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email || 'Unknown User'}
                        </p>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getRoleColor(user.role)}`}
                        >
                          {getRoleText(user.role)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Last seen: {user.last_seen ? new Date(user.last_seen).toLocaleTimeString() : 'Now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users online</p>
              </div>
            )}
          </div>

          {/* Футер с дополнительной информацией */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Real-time collaboration</span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Live</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;
