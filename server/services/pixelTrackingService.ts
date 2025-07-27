import { PIXEL_TRACKER_CONFIG, type PixelTrackingResponse, type PixelStatusResponse, type DashboardStats } from "../config/pixelTracker";

export class PixelTrackingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = PIXEL_TRACKER_CONFIG.BASE_URL;
  }

  /**
   * Creates a unique tracking pixel for an email
   */
  async createPixel(): Promise<PixelTrackingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${PIXEL_TRACKER_CONFIG.API_ENDPOINTS.CREATE}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create pixel: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        embedCode: data.embedCode
      };
    } catch (error) {
      console.error('Error creating pixel:', error);
      throw new Error('Failed to create tracking pixel');
    }
  }

  /**
   * Checks the status and analytics for a specific pixel
   */
  async checkPixelStatus(pixelId: string): Promise<PixelStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${PIXEL_TRACKER_CONFIG.API_ENDPOINTS.CHECK}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: pixelId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check pixel status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        opened: data.opened || false,
        openedAt: data.openedAt,
        lastSeenAt: data.lastSeenAt,
        viewCount: data.viewCount || 0,
        totalViewTime: data.totalViewTime || 0,
        message: data.message
      };
    } catch (error) {
      console.error('Error checking pixel status:', error);
      return {
        opened: false,
        viewCount: 0,
        totalViewTime: 0,
        message: 'Failed to check pixel status'
      };
    }
  }

  /**
   * Format milliseconds to human-readable time format (mm:ss)
   */
  static formatEngagementTime(milliseconds: number): string {
    if (!milliseconds || milliseconds < 0) return '0:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Categorize engagement level based on time spent
   */
  static getEngagementLevel(totalViewTime: number): {
    level: 'high' | 'medium' | 'low' | 'none';
    label: string;
    color: string;
  } {
    if (totalViewTime === 0) {
      return { level: 'none', label: 'Not Opened', color: 'gray' };
    } else if (totalViewTime >= 30000) { // 30+ seconds
      return { level: 'high', label: 'High Interest', color: 'green' };
    } else if (totalViewTime >= 10000) { // 10-29 seconds
      return { level: 'medium', label: 'Medium Interest', color: 'yellow' };
    } else {
      return { level: 'low', label: 'Quick Glance', color: 'orange' };
    }
  }

  /**
   * Retrieves dashboard statistics for all pixels
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await fetch(`${this.baseUrl}${PIXEL_TRACKER_CONFIG.API_ENDPOINTS.DASHBOARD}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get dashboard stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        totalPixels: data.totalPixels || 0,
        openRate: data.openRate || 0,
        averageViewTime: data.averageViewTime || 0,
        recentActivity: data.recentActivity || []
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalPixels: 0,
        openRate: 0,
        averageViewTime: 0,
        recentActivity: []
      };
    }
  }

  /**
   * Embeds the pixel tracking code into email HTML
   */
  embedPixelInEmail(emailHtml: string, embedCode: string): string {
    // Insert pixel embed code before closing </body> tag
    const bodyCloseTag = '</body>';
    const bodyCloseIndex = emailHtml.lastIndexOf(bodyCloseTag);
    
    if (bodyCloseIndex !== -1) {
      return emailHtml.slice(0, bodyCloseIndex) + embedCode + emailHtml.slice(bodyCloseIndex);
    } else {
      // If no </body> tag found, append to the end
      return emailHtml + embedCode;
    }
  }
}

// Export singleton instance
export const pixelTrackingService = new PixelTrackingService();