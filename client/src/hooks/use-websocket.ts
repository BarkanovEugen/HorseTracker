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
        // Invalidate alerts queries
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        break;
      
      default:
        break;
    }
  }, [lastMessage, queryClient]);
}
