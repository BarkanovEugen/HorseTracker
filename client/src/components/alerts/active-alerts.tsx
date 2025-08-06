import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ActiveAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alertsData = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  // Sort alerts: escalated first, then by creation date (newest first)
  const alerts = alertsData.sort((a, b) => {
    // Escalated alerts always come first
    if (a.escalated && !b.escalated) return -1;
    if (!a.escalated && b.escalated) return 1;
    
    // If both escalated or both not escalated, sort by creation date
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    return 0;
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiRequest('POST', `/api/alerts/${alertId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Уведомление отклонено",
        description: "Уведомление было успешно отклонено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отклонить уведомление",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (alert: Alert) => {
    // Escalated alerts get special red styling regardless of base severity
    if (alert.escalated) {
      return 'bg-red-100 dark:bg-red-900/40 border-l-red-600 border-2';
    }
    
    switch (alert.severity) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-900/20 border-l-red-500';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500';
    }
  };

  const getSeverityIcon = (alert: Alert) => {
    // Escalated alerts get special pulsing red icon
    if (alert.escalated) {
      return <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />;
    }
    
    switch (alert.severity) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityTextColor = (alert: Alert) => {
    // Escalated alerts get bold red text
    if (alert.escalated) {
      return 'text-red-900 dark:text-red-100 font-bold';
    }
    
    switch (alert.severity) {
      case 'urgent':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3">
          <h2 className="text-white font-semibold flex items-center" data-testid="alerts-title">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Активные Уведомления
          </h2>
        </div>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Нет активных уведомлений
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-3 sm:px-5 py-2.5 sm:py-3">
        <h2 className="text-white font-bold flex items-center text-sm sm:text-base" data-testid="alerts-title">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 animate-pulse" />
          <span className="truncate">Активные Уведомления</span>
          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
            {alerts.length}
          </span>
        </h2>
      </div>
      
      <CardContent className="p-0 max-h-64 sm:max-h-96 overflow-y-auto">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 sm:p-4 border-l-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 ${getSeverityColor(alert)} ${
                alert.escalated ? 'pulse-red-border' : ''
              }`}
              data-testid={`alert-${alert.id}`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(alert)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm sm:text-base ${getSeverityTextColor(alert)} leading-tight`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs sm:text-sm ${getSeverityTextColor(alert).replace('900', '700').replace('800', '600').replace('200', '300').replace('100', '200')} mt-0.5 leading-relaxed`}>
                    {alert.description}
                  </p>
                  {alert.escalated && alert.escalatedAt && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                        🚨 КРИТИЧНО
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {new Date(alert.escalatedAt).toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Dismiss Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissMutation.mutate(alert.id)}
                  disabled={dismissMutation.isPending}
                  className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                  data-testid={`dismiss-alert-${alert.id}`}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
