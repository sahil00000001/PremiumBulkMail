// Centralized pixel tracking configuration
export const PIXEL_TRACKER_CONFIG = {
  BASE_URL: process.env.PIXEL_TRACKER_BASE_URL || "https://pixel-tracker-dc1i.onrender.com",
  API_ENDPOINTS: {
    CREATE: "/api/pixel/create",
    CHECK: "/api/pixel/check",
    DASHBOARD: "/api/dashboard"
  }
};

export interface PixelTrackingResponse {
  id: string;
  embedCode: string;
}

export interface PixelStatusResponse {
  opened: boolean;
  openedAt?: string;
  lastSeenAt?: string;
  viewCount: number;
  totalViewTime: number;
  message?: string;
}

export interface DashboardStats {
  totalPixels: number;
  openRate: number;
  averageViewTime: number;
  recentActivity: any[];
}