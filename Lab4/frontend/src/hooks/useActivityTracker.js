import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';

const useActivityTracker = () => {
  const { user } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const activityIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Проверяем статус подключения с обработкой ошибок
    let isConnected = false;
    try {
      isConnected = websocketService.getConnectionStatus();
    } catch (error) {
      console.warn('Failed to check WebSocket connection status:', error);
      return;
    }

    if (!isConnected) {
      return;
    }

    // Функция для отправки активности
    const sendActivity = () => {
      try {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;
        
        // Отправляем активность только если прошло достаточно времени (например, 30 секунд)
        if (timeSinceLastActivity >= 30000) {
          websocketService.sendActivity(user.id);
          lastActivityRef.current = now;
        }
      } catch (error) {
        console.warn('Failed to send activity:', error);
      }
    };

    // События активности пользователя
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Обработчики событий активности
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Добавляем обработчики событий
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Периодическая отправка активности (каждые 30 секунд)
    activityIntervalRef.current = setInterval(sendActivity, 30000);

    // Очистка при размонтировании
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [user]);

  // Отправка активности при изменении страницы
  useEffect(() => {
    if (user && websocketService.getConnectionStatus()) {
      websocketService.sendActivity(user.id);
    }
  }, [user]);

  return null; // Этот хук не возвращает JSX
};

export default useActivityTracker;
