import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/contexts/websocket-context";

export function useRealtimeUpdates() {
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const lastProcessedMessage = useRef<any>(null);

  useEffect(() => {
    if (!lastMessage || lastMessage === lastProcessedMessage.current) {
      return;
    }

    lastProcessedMessage.current = lastMessage;

    switch (lastMessage.type) {
      case 'location_update':
        // Invalidate location-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/horses'] });
        break;
      
      case 'alert_created':
      case 'alert_dismissed':
      case 'alert_escalated':
        // Invalidate alerts queries for all alert events
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        break;
      
      case 'push_notification':
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(lastMessage.data.title, {
            body: lastMessage.data.body,
            icon: lastMessage.data.icon || '/favicon.ico',
            tag: lastMessage.data.tag,
            requireInteraction: lastMessage.data.requireInteraction || false
          });
          
          // Auto-close notification after 5 seconds unless it requires interaction
          if (!lastMessage.data.requireInteraction) {
            setTimeout(() => notification.close(), 5000);
          }
        }
        break;
      
      default:
        break;
    }
  }, [lastMessage, queryClient]);
}
