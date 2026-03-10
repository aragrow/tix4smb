import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type { User } from '@/types';

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/api/me').then((r) => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  return { user, isLoading, isAuthenticated: !isError && Boolean(user) };
}
