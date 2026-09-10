import { API_BASE_URL } from "../config";
/* eslint-disable react/set-state-in-effect */
// frontend/src/utils/socket.js
import io from 'socket.io-client';
import { auth } from './auth';

let socket = null;

export const initializeSocket = () => {
  if (socket && socket.connected) return socket;
  
  const user = auth.getCurrentUser();
  if (!user) {
    console.log('❌ No user found, skipping socket initialization');
    return null;
  }
  
  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  
  // =========================================================
  // CONNECTION EVENTS
  // =========================================================
  
  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    
    // Authenticate user
    socket.emit('authenticate', { user_id: user.id }, (response) => {
      if (response?.status === 'authenticated') {
        console.log('✅ Socket authenticated for user:', user.id);
      } else {
        console.log('❌ Socket authentication failed');
      }
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Socket connection error:', error);
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    // Re-authenticate on reconnect
    socket.emit('authenticate', { user_id: user.id });
  });
  
  // =========================================================
  // NOTIFICATION EVENTS
  // =========================================================
  
  // New booking notification (for providers)
  socket.on('new_booking', (data) => {
    console.log('📢 New booking notification:', data);
    
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('new_booking', { detail: data }));
    
    // Show notification if browser supports it
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 New Booking Request', {
        body: `${data.customer_name} booked ${data.service} for ${data.date}`,
        icon: '🔧',
      });
    }
  });
  
  // Booking status update
  socket.on('booking_update', (data) => {
    console.log('📢 Booking update:', data);
    
    window.dispatchEvent(new CustomEvent('booking_update', { detail: data }));
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📋 Booking Update', {
        body: data.message,
        icon: '📋',
      });
    }
  });
  
  // New message notification
  socket.on('new_message', (data) => {
    console.log('📢 New message:', data);
    
    window.dispatchEvent(new CustomEvent('new_message', { detail: data }));
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('💬 New Message', {
        body: `${data.sender_name}: ${data.message}`,
        icon: '💬',
      });
    }
  });
  
  // Notification count update
  socket.on('notification_count', (data) => {
    console.log('📢 Notification count:', data.count);
    window.dispatchEvent(new CustomEvent('notification_count', { detail: data }));
  });
  
  return socket;
};

// =========================================================
// DISCONNECT SOCKET
// =========================================================

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected manually');
  }
};

// =========================================================
// GET SOCKET INSTANCE
// =========================================================

export const getSocket = () => {
  return socket;
};

// =========================================================
// CHECK SOCKET STATUS
// =========================================================

export const isSocketConnected = () => {
  return socket && socket.connected;
};

// =========================================================
// REQUEST NOTIFICATION PERMISSION
// =========================================================

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// =========================================================
// EMIT CUSTOM EVENT
// =========================================================

export const emitEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    return true;
  }
  console.log('❌ Socket not connected, cannot emit event:', eventName);
  return false;
};

// =========================================================
// JOIN ROOM
// =========================================================

export const joinRoom = (roomName) => {
  if (socket && socket.connected) {
    socket.emit('join_room', { room: roomName });
    return true;
  }
  return false;
};

// =========================================================
// LEAVE ROOM
// =========================================================

export const leaveRoom = (roomName) => {
  if (socket && socket.connected) {
    socket.emit('leave_room', { room: roomName });
    return true;
  }
  return false;
};

// =========================================================
// SOCKET HOOK - For React components
// =========================================================

import { useEffect, useState } from 'react';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (!user) {
      console.log('❌ No user for socket connection');
      return;
    }

    // Initialize socket
    const sock = initializeSocket();
    setSocketInstance(sock);
    setIsConnected(sock?.connected || false);

    // Listen for connection changes
    const handleConnect = () => {
      setIsConnected(true);
      console.log('🟢 Socket connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('🔴 Socket disconnected');
    };

    if (sock) {
      sock.on('connect', handleConnect);
      sock.on('disconnect', handleDisconnect);
    }

    return () => {
      if (sock) {
        sock.off('connect', handleConnect);
        sock.off('disconnect', handleDisconnect);
      }
      disconnectSocket();
    };
  }, []);

  return { socket: socketInstance, isConnected };
};

// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  requestNotificationPermission,
  emitEvent,
  joinRoom,
  leaveRoom,
  useSocket,
};