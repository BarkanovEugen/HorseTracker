import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface User {
  id: string;
  vkId?: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  photoUrl?: string;
  lastLogin: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: string;
}

export function useAuth(): AuthState & { logout: () => void } {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/auth/logout', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response;
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
      // Redirect to login page
      setLocation('/login');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local state
      queryClient.clear();
      setLocation('/login');
    }
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
    error: error?.message,
    logout
  };
}

// Custom hook to check if user should be redirected to login
export function useAuthGuard(requireAuth: boolean = true) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If authentication is required and user is not authenticated (and not loading)
  if (requireAuth && !isAuthenticated && !isLoading) {
    setLocation('/login');
    return false;
  }

  // If authentication is not required or user is authenticated
  return true;
}

// Hook to redirect authenticated users away from login page
export function useLoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated && !isLoading) {
    setLocation('/');
    return true;
  }

  return false;
}