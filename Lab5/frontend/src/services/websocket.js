import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(userId, userEmail, userRole) {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });
    } catch (error) {
      console.warn('Failed to create WebSocket connection:', error);
      return;
    }

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      
      
      this.socket.emit('user_online', {
        user_id: userId,
        user_email: userEmail,
        user_role: userRole
      });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
    });

  
    this.socket.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });

    this.socket.on('active_users', (users) => {
      this.emit('active_users', users);
    });

    this.socket.on('user_joined_room', (data) => {
      this.emit('user_joined_room', data);
    });

    this.socket.on('user_left_room', (data) => {
      this.emit('user_left_room', data);
    });

    this.socket.on('user_status_changed', (data) => {
      this.emit('user_status_changed', data);
    });

    this.socket.on('users_status_update', (data) => {
      this.emit('users_status_update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendActivity(userId) {
    try {
      if (this.socket && this.isConnected) {
        this.socket.emit('user_activity', { user_id: userId });
      }
    } catch (error) {
      console.warn('Failed to send activity via WebSocket:', error);
    }
  }

  sendStatusUpdate(userId, status) {
    try {
      if (this.socket && this.isConnected) {
        this.socket.emit('user_status_update', { user_id: userId, status: status });
      }
    } catch (error) {
      console.warn('Failed to send status update via WebSocket:', error);
    }
  }

  sendUserOffline(userId) {
    try {
      if (this.socket && this.isConnected) {
        this.socket.emit('user_offline', { user_id: userId });
      }
    } catch (error) {
      console.warn('Failed to send user offline via WebSocket:', error);
    }
  }


  joinRoom(room, userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', { room, user_id: userId });
    }
  }


  leaveRoom(room, userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', { room, user_id: userId });
    }
  }


  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }


  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }


  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }


  getConnectionStatus() {
    return this.isConnected;
  }
}


const websocketService = new WebSocketService();

export default websocketService;
