class StravaService {
  private static instance: StravaService;
  private refreshPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): StravaService {
    if (!StravaService.instance) {
      StravaService.instance = new StravaService();
    }
    return StravaService.instance;
  }

  async handleResponse(response: Response) {
    if (response.status === 401) {
      // Try refreshing the token
      await this.refreshToken();
      // Retry the original request
      return fetch(response.url, {
        credentials: 'include'
      });
    }
    return response;
  }

  async refreshToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = fetch('/api/auth/strava/refresh', {
        credentials: 'include'
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to refresh token');
          }
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  async getAthlete() {
    try {
      const response = await fetch('/api/auth/strava/athlete', {
        credentials: 'include'
      });
      
      const handledResponse = await this.handleResponse(response);
      if (!handledResponse.ok) {
        throw new Error('Failed to fetch athlete data');
      }
      
      return handledResponse.json();
    } catch (error) {
      console.error('Error fetching athlete data:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch('/api/auth/strava/logout', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to logout');
      }
      return response.json();
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }
}

export const stravaService = StravaService.getInstance(); 