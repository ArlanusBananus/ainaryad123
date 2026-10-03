let socket = null;
let reconnectTimer = null;
let listeners = new Set();
let statusListeners = new Set();

export function initWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      notifyStatus(true);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        listeners.forEach((callback) => callback(payload));
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    socket.onclose = () => {
      notifyStatus(false);
      socket = null;
      // Reconnect after 3 seconds
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          initWebSocket();
        }, 3000);
      }
    };

    socket.onerror = (err) => {
      console.warn('WS error:', err);
      notifyStatus(false);
    };
  } catch (err) {
    console.error('WebSocket connection failed:', err);
    notifyStatus(false);
  }
}

function notifyStatus(isConnected) {
  statusListeners.forEach((cb) => cb(isConnected));
}

export function subscribeToEvents(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function subscribeToStatus(callback) {
  statusListeners.add(callback);
  if (socket) {
    callback(socket.readyState === WebSocket.OPEN);
  } else {
    callback(false);
  }
  return () => {
    statusListeners.delete(callback);
  };
}
