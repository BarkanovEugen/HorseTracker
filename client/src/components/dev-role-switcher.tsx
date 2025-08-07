import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCheck, Eye, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DevRoleInfo {
  currentRole: 'admin' | 'instructor' | 'viewer';
  availableRoles: string[];
  isDevelopmentMode: boolean;
}

const roleIcons = {
  admin: Shield,
  instructor: UserCheck,
  viewer: Eye
};

const roleLabels = {
  admin: 'Администратор',
  instructor: 'Инструктор', 
  viewer: 'Наблюдатель'
};

const roleDescriptions = {
  admin: 'Полный доступ ко всем функциям',
  instructor: 'Редактирование занятий, просмотр лошадей и инструкторов',
  viewer: 'Только просмотр основных разделов, без финансовых данных'
};

export default function DevRoleSwitcher() {
  const [roleInfo, setRoleInfo] = useState<DevRoleInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoleInfo();
  }, []);

  const fetchRoleInfo = async () => {
    try {
      const response = await fetch('/api/dev/role');
      if (response.ok) {
        const data = await response.json();
        setRoleInfo(data);
        setSelectedRole(data.currentRole);
      }
    } catch (error) {
      // Role switching not available or in production mode
    }
  };

  const switchRole = async () => {
    if (!selectedRole || selectedRole === roleInfo?.currentRole) return;

    setIsLoading(true);
    try {
      const response = await apiRequest('/api/dev/role', {
        method: 'POST',
        body: { role: selectedRole }
      });

      if (response.success) {
        setRoleInfo(prev => prev ? { ...prev, currentRole: selectedRole as any } : null);
        toast({
          title: "Роль изменена",
          description: `Теперь вы работаете как ${roleLabels[selectedRole as keyof typeof roleLabels]}`,
          duration: 3000,
        });
        
        // Refresh the page to apply new permissions
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сменить роль",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if not in development mode
  if (!roleInfo?.isDevelopmentMode) {
    return null;
  }

  const currentRoleIcon = roleIcons[roleInfo.currentRole];

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-amber-800 dark:text-amber-200">
            Режим тестирования ролей
          </CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Эта функция доступна только в тестовом окружении
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Текущая роль:
          </span>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <currentRoleIcon className="w-3 h-3 mr-1" />
            {roleLabels[roleInfo.currentRole]}
          </Badge>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Переключить на роль:
          </label>
          <Select 
            value={selectedRole} 
            onValueChange={setSelectedRole}
            data-testid="role-selector"
          >
            <SelectTrigger className="bg-white dark:bg-amber-950">
              <SelectValue placeholder="Выберите роль" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {roleInfo.availableRoles.map((role) => {
                const Icon = roleIcons[role as keyof typeof roleIcons];
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <div>
                        <div className="font-medium">
                          {roleLabels[role as keyof typeof roleLabels]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {roleDescriptions[role as keyof typeof roleDescriptions]}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={switchRole}
          disabled={isLoading || selectedRole === roleInfo.currentRole || !selectedRole}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          data-testid="switch-role-button"
        >
          {isLoading ? "Переключение..." : "Применить роль"}
        </Button>

        <div className="text-xs text-amber-600 dark:text-amber-400">
          <strong>Внимание:</strong> После смены роли страница будет перезагружена для применения новых прав доступа.
        </div>
      </CardContent>
    </Card>
  );
}