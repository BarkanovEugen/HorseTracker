import { useQuery } from '@tanstack/react-query';

export interface UserPermissions {
  canEdit: boolean;
  canView: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageDevices: boolean;
  canManageGeofences: boolean;
  canViewFinancialData: boolean;
  canEditLessons: boolean;
  canManageHorses: boolean;
  canManageInstructors: boolean;
  role: 'admin' | 'instructor' | 'viewer' | 'guest';
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

export function useCanEditLessons() {
  const { data: permissions } = usePermissions();
  return permissions?.canEditLessons ?? false;
}

export function useCanViewFinancialData() {
  const { data: permissions } = usePermissions();
  return permissions?.canViewFinancialData ?? false;
}

export function useCanManageHorses() {
  const { data: permissions } = usePermissions();
  return permissions?.canManageHorses ?? false;
}

export function useCanManageInstructors() {
  const { data: permissions } = usePermissions();
  return permissions?.canManageInstructors ?? false;
}

export function useCanManageSettings() {
  const { data: permissions } = usePermissions();
  return permissions?.canManageSettings ?? false;
}