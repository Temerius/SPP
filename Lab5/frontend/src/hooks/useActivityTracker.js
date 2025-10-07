import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';

const useActivityTracker = () => {
  const { user } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const statusTimerRef = useRef(null);
  const currentStatusRef = useRef('active');

  useEffect(() => {
    if (!user) {
      return;
    }

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

    const startStatusTimer = (status) => {
      // Очищаем предыдущий таймер
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }

      const timeout = status === 'active' ? 30000 : 300000; // 30 сек для active, 5 мин для idle
      
      statusTimerRef.current = setTimeout(() => {
        const newStatus = status === 'active' ? 'idle' : 'offline';
        currentStatusRef.current = newStatus;
        
        // Отправляем новый статус на сервер
        websocketService.sendStatusUpdate(user.id, newStatus);
        
        // Если стал offline, запускаем таймер на удаление
        if (newStatus === 'offline') {
          setTimeout(() => {
            websocketService.sendUserOffline(user.id);
          }, 1000);
        }
      }, timeout);
    };

    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Если активность была недавно (менее 5 секунд), сбрасываем таймер
      if (timeSinceLastActivity < 5000) {
        lastActivityRef.current = now;
        
        // Если статус был idle, возвращаем к active
        if (currentStatusRef.current === 'idle') {
          currentStatusRef.current = 'active';
          websocketService.sendStatusUpdate(user.id, 'active');
        }
        
        // Перезапускаем таймер
        startStatusTimer('active');
      }
    };

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Добавляем обработчики событий
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Запускаем начальный таймер
    startStatusTimer('active');

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, [user]);

  return null;
};

export default useActivityTracker;
