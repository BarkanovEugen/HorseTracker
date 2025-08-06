import { useQuery } from '@tanstack/react-query';

export interface UserPermissions {
  canEdit: boolean;
  canView: boolean;
  canManageUsers: boolean;
  role: 'admin' | 'viewer' | 'guest';
}

export function usePermissions() {
  return useQuery<UserPermissions>({
    queryKey: ['/api/auth/permissions'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCanEdit() {
  const { data: permissions } = usePermissions();
  return permissions?.canEdit ?? false;
}

export function useCanView() {
  const { data: permissions } = usePermissions();
  return permissions?.canView ?? false;
}

export function useCanManageUsers() {
  const { data: permissions } = usePermissions();
  return permissions?.canManageUsers ?? false;
}

export function useUserRole() {
  const { data: permissions } = usePermissions();
  return permissions?.role ?? 'guest';
}