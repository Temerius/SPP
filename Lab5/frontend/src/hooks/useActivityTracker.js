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

    const sendActivity = () => {
      try {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;
        
        if (timeSinceLastActivity >= 30000) {
          websocketService.sendActivity(user.id);
          lastActivityRef.current = now;
        }
      } catch (error) {
        console.warn('Failed to send activity:', error);
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


    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

 
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

 
    activityIntervalRef.current = setInterval(sendActivity, 30000);


    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [user]);

 
  useEffect(() => {
    if (user && websocketService.getConnectionStatus()) {
      websocketService.sendActivity(user.id);
    }
  }, [user]);

  return null;
};

export default useActivityTracker;
