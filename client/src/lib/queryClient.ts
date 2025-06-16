import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add token header as backup authentication
  const isAdminRequest = url.includes('/admin/');
  const token = isAdminRequest 
    ? localStorage.getItem('wagba_admin_token')
    : localStorage.getItem('wagba_auth_token');
    
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add token header as backup authentication
    const isAdminRequest = queryKey[0].toString().includes('/admin/');
    const token = isAdminRequest 
      ? localStorage.getItem('wagba_admin_token')
      : localStorage.getItem('wagba_auth_token');
      
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: (query) => {
        // Always refetch auth queries on window focus
        const isAuthQuery = query.queryKey[0]?.toString().includes('/auth/');
        return isAuthQuery ? true : false;
      },
      staleTime: (query) => {
        // Auth queries should always be fresh
        const isAuthQuery = query.queryKey[0]?.toString().includes('/auth/');
        return isAuthQuery ? 0 : Infinity;
      },
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Global cache reset function for authentication state changes
export const resetAuthCache = () => {
  queryClient.clear();
  queryClient.invalidateQueries();
  // Force immediate refetch of all auth queries
  queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
  queryClient.refetchQueries({ queryKey: ['/api/admin/auth/me'] });
};
