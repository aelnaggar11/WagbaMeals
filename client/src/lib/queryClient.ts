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
    const queryKeyStr = queryKey[0] as string;
    const isAdminRequest = queryKeyStr.includes('/admin/');
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
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Consider all data stale immediately
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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

// Aggressive cache invalidation utility for immediate UI updates
export const forceRefreshQuery = async (queryKey: any[]) => {
  console.log('=== FORCE REFRESH DEBUG ===');
  console.log('Query key:', queryKey);
  
  // Step 1: Set new data to force immediate update
  queryClient.setQueryData(queryKey, null);
  console.log('Set query data to null');
  
  // Step 2: Remove existing data from cache completely
  queryClient.removeQueries({ queryKey });
  console.log('Removed cached data');
  
  // Step 3: Invalidate to mark as stale
  await queryClient.invalidateQueries({ queryKey });
  console.log('Invalidated queries');
  
  // Step 4: Force immediate refetch with fetchActiveQueries for mounted components
  try {
    const result = await queryClient.refetchQueries({ 
      queryKey,
      type: 'active' // Only refetch active/mounted queries
    });
    console.log('Active refetch result:', result);
    
    // Step 5: Fallback - try fetching the data directly
    const fallbackResult = await queryClient.fetchQuery({
      queryKey,
      staleTime: 0
    });
    console.log('Fallback fetch result:', fallbackResult);
    
    return fallbackResult;
  } catch (error) {
    console.error('Refetch error:', error);
    
    // Final fallback - manual data fetch
    setTimeout(async () => {
      console.log('Final fallback refetch triggered');
      await queryClient.invalidateQueries({ queryKey });
    }, 100);
  }
};
