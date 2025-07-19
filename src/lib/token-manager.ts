interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
  tokenType: string;
}

class TokenManager {
  private static instance: TokenManager;
  private tokenCache: Map<string, CachedToken> = new Map();
  private readonly BUFFER_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private async fetchAdupToken(): Promise<TokenResponse> {
    const clientId = process.env.ADUP_CLIENT_ID;
    const clientSecret = process.env.ADUP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('ADUP_CLIENT_ID and ADUP_CLIENT_SECRET must be set in environment variables');
    }

    const response = await fetch('https://api.adup-tech.com/v202101/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Adup token: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchTaboolaToken(): Promise<TokenResponse> {
    const clientId = process.env.TABOOLA_CLIENT_ID;
    const clientSecret = process.env.TABOOLA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('TABOOLA_CLIENT_ID and TABOOLA_CLIENT_SECRET must be set in environment variables');
    }

    const response = await fetch('https://backstage.taboola.com/backstage/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Taboola token: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private isTokenExpired(cachedToken: CachedToken): boolean {
    return Date.now() + this.BUFFER_TIME >= cachedToken.expiresAt;
  }

  async getAdupToken(): Promise<string> {
    const cacheKey = 'adup';
    const cached = this.tokenCache.get(cacheKey);

    if (cached && !this.isTokenExpired(cached)) {
      return cached.token;
    }

    try {
      console.log('Fetching new Adup token...');
      const tokenResponse = await this.fetchAdupToken();
      
      const cachedToken: CachedToken = {
        token: tokenResponse.access_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        tokenType: tokenResponse.token_type,
      };

      this.tokenCache.set(cacheKey, cachedToken);
      console.log('Adup token cached successfully');
      
      return tokenResponse.access_token;
    } catch (error) {
      console.error('Error fetching Adup token:', error);
      throw error;
    }
  }

  async getTaboolaToken(): Promise<string> {
    const cacheKey = 'taboola';
    const cached = this.tokenCache.get(cacheKey);

    if (cached && !this.isTokenExpired(cached)) {
      return cached.token;
    }

    try {
      console.log('Fetching new Taboola token...');
      const tokenResponse = await this.fetchTaboolaToken();
      
      const cachedToken: CachedToken = {
        token: tokenResponse.access_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        tokenType: tokenResponse.token_type,
      };

      this.tokenCache.set(cacheKey, cachedToken);
      console.log('Taboola token cached successfully');
      
      return tokenResponse.access_token;
    } catch (error) {
      console.error('Error fetching Taboola token:', error);
      throw error;
    }
  }

  async getToken(platform: 'adup' | 'taboola'): Promise<string> {
    switch (platform) {
      case 'adup':
        return this.getAdupToken();
      case 'taboola':
        return this.getTaboolaToken();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  clearCache(): void {
    this.tokenCache.clear();
    console.log('Token cache cleared');
  }

  getCacheStatus(): Record<string, { hasToken: boolean; expiresAt?: number; isExpired?: boolean }> {
    const status: Record<string, any> = {};
    
    for (const [platform, cachedToken] of this.tokenCache.entries()) {
      status[platform] = {
        hasToken: true,
        expiresAt: cachedToken.expiresAt,
        isExpired: this.isTokenExpired(cachedToken),
      };
    }

    return status;
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Export types for use in other files
export type { TokenResponse, CachedToken }; 