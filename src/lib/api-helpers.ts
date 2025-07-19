import { tokenManager } from './token-manager';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function makeAuthenticatedRequest<T>(
  platform: 'adup' | 'taboola',
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = await tokenManager.getToken(platform);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Error making authenticated request to ${platform}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getAdupToken(): Promise<string> {
  return tokenManager.getAdupToken();
}

export async function getTaboolaToken(): Promise<string> {
  return tokenManager.getTaboolaToken();
}

export function getTokenCacheStatus() {
  return tokenManager.getCacheStatus();
}

export function clearTokenCache() {
  return tokenManager.clearCache();
} 