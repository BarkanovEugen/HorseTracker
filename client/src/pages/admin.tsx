import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCanManageUsers } from '../hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Shield, Users, Eye, Edit } from 'lucide-react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  vkId: string;
  firstName: string;
  lastName: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  role: 'admin' | 'instructor' | 'viewer';
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export default function AdminPage() {
  const canManageUsers = useCanManageUsers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Redirect if user doesn't have admin access
  if (!canManageUsers) {
    setLocation('/dashboard');
    return null;
  }

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'instructor' | 'viewer' }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Роль обновлена",
        description: "Роль пользователя была успешно изменена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить роль пользователя",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'instructor' | 'viewer') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'instructor': return 'outline';
      case 'viewer': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3 h-3" />;
      case 'instructor': return <Edit className="w-3 h-3" />;
      case 'viewer': return <Eye className="w-3 h-3" />;
      default: return <Eye className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Администрирование</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Администрирование</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Управление пользователями
          </CardTitle>
          <CardDescription>
            Управляйте ролями пользователей и их правами доступа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`user-row-${user.id}`}
              >
                <div className="flex items-center gap-4">
                  {user.photoUrl && (
                    <img
                      src={user.photoUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-10 h-10 rounded-full"
                      data-testid={`user-avatar-${user.id}`}
                    />
                  )}
                  <div>
                    <div className="font-medium" data-testid={`user-name-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500" data-testid={`user-username-${user.id}`}>
                      @{user.username || user.vkId}
                    </div>
                    {user.lastLogin && (
                      <div className="text-xs text-gray-400" data-testid={`user-last-login-${user.id}`}>
                        Последний вход: {new Date(user.lastLogin).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    className="flex items-center gap-1"
                    data-testid={`user-role-badge-${user.id}`}
                  >
                    {getRoleIcon(user.role)}
                    {user.role === 'admin' ? 'Администратор' : 
                     user.role === 'instructor' ? 'Инструктор' : 'Наблюдатель'}
                  </Badge>

                  <Select
                    value={user.role}
                    onValueChange={(newRole: 'admin' | 'instructor' | 'viewer') => handleRoleChange(user.id, newRole)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-40" data-testid={`role-select-${user.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" data-testid="role-option-admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3" />
                          Администратор
                        </div>
                      </SelectItem>
                      <SelectItem value="instructor" data-testid="role-option-instructor">
                        <div className="flex items-center gap-2">
                          <Edit className="w-3 h-3" />
                          Инструктор
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer" data-testid="role-option-viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          Наблюдатель
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {users?.length === 0 && (
              <div className="text-center py-8 text-gray-500" data-testid="no-users-message">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Пользователи не найдены</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Роли и права доступа</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium">Администратор</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Полный доступ к системе</li>
                <li>• Управление лошадьми и устройствами</li>
                <li>• Создание и редактирование геозон</li>
                <li>• Управление пользователями</li>
                <li>• Настройки системы</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Edit className="w-4 h-4 text-green-600" />
                <h3 className="font-medium">Инструктор</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Доступ к панели управления</li>
                <li>• Просмотр лошадей (без изменений)</li>
                <li>• Редактирование занятий в календаре</li>
                <li>• Просмотр финансовых данных</li>
                <li>• История и инструкторы</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-gray-600" />
                <h3 className="font-medium">Наблюдатель</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Доступ к панели управления</li>
                <li>• Просмотр лошадей (без изменений)</li>
                <li>• Календарь (без денежных данных)</li>
                <li>• История и инструкторы</li>
                <li>• Только просмотр оповещений</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}