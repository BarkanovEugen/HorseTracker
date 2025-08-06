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
    <Card className="mb-6">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3">
        <h2 className="text-white font-semibold flex items-center" data-testid="alerts-title">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Активные Уведомления
        </h2>
      </div>
      
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border-l-4 ${getSeverityColor(alert)} ${
                alert.escalated ? 'animate-pulse' : alert.severity === 'urgent' ? 'animate-pulse' : ''
              } ${alert.escalated ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}
              data-testid={`alert-${alert.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getSeverityIcon(alert)}
                  <div>
                    <p className={`font-medium ${getSeverityTextColor(alert)}`}>
                      {alert.title}
                    </p>
                    <p className={`text-sm ${getSeverityTextColor(alert).replace('900', '700').replace('800', '600').replace('200', '300').replace('100', '200')}`}>
                      {alert.description}
                    </p>
                    {alert.escalated && alert.escalatedAt && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        🚨 Эскалировано: {new Date(alert.escalatedAt).toLocaleTimeString('ru-RU')}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissMutation.mutate(alert.id)}
                  disabled={dismissMutation.isPending}
                  className={`${getSeverityTextColor(alert)} hover:bg-opacity-20`}
                  data-testid={`dismiss-alert-${alert.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
