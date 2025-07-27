import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import type { InsertVisitor, Visitor } from '@shared/schema';

export interface VisitorSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
}

export interface VisitorStats {
  totalVisitors: number;
  activeVisitors: number;
  totalTimeSpent: number;
  averageTimeSpent: number;
  visitorsToday: number;
}

export class VisitorTrackingService {
  private activeSessions = new Map<string, VisitorSession>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Start tracking a new visitor session
   */
  async startVisitorSession(ipAddress?: string, userAgent?: string): Promise<string> {
    const sessionId = uuidv4();
    const now = Date.now();
    const currentTime = new Date().toISOString();

    // Create session in memory
    this.activeSessions.set(sessionId, {
      sessionId,
      startTime: now,
      lastActivity: now,
      isActive: true
    });

    // Save to database
    const visitorData: InsertVisitor = {
      sessionId,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      visitedAt: currentTime,
      lastSeenAt: currentTime,
      timeSpentMs: 0,
      isActive: true
    };

    try {
      await storage.createVisitorSession(visitorData);
      console.log(`New visitor session started: ${sessionId}`);
    } catch (error) {
      console.error('Failed to save visitor session to database:', error);
    }

    return sessionId;
  }

  /**
   * Update visitor activity (heartbeat)
   */
  async updateVisitorActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    const now = Date.now();
    const timeSpentMs = now - session.startTime;
    
    session.lastActivity = now;
    this.activeSessions.set(sessionId, session);

    // Update database
    try {
      await storage.updateVisitorActivity(sessionId, new Date().toISOString(), timeSpentMs);
    } catch (error) {
      console.error(`Failed to update visitor activity for ${sessionId}:`, error);
    }
  }

  /**
   * End visitor session
   */
  async endVisitorSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const now = Date.now();
    const totalTimeSpent = now - session.startTime;

    // Update database with final time
    try {
      await storage.endVisitorSession(sessionId, new Date().toISOString(), totalTimeSpent);
      console.log(`Visitor session ended: ${sessionId}, total time: ${Math.round(totalTimeSpent / 1000)}s`);
    } catch (error) {
      console.error(`Failed to end visitor session ${sessionId}:`, error);
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get current visitor statistics
   */
  async getVisitorStats(): Promise<VisitorStats> {
    try {
      const allVisitors = await storage.getAllVisitors();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const totalVisitors = allVisitors.length;
      const activeVisitors = this.activeSessions.size;
      const visitorsToday = allVisitors.filter(v => v.visitedAt >= todayStart).length;
      
      const totalTimeSpent = allVisitors.reduce((sum, visitor) => sum + (visitor.timeSpentMs || 0), 0);
      const averageTimeSpent = totalVisitors > 0 ? totalTimeSpent / totalVisitors : 0;

      return {
        totalVisitors,
        activeVisitors,
        totalTimeSpent,
        averageTimeSpent: Math.round(averageTimeSpent),
        visitorsToday
      };
    } catch (error) {
      console.error('Failed to get visitor stats:', error);
      return {
        totalVisitors: 0,
        activeVisitors: this.activeSessions.size,
        totalTimeSpent: 0,
        averageTimeSpent: 0,
        visitorsToday: 0
      };
    }
  }

  /**
   * Get active sessions for real-time display
   */
  getActiveSessions(): VisitorSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        sessionsToRemove.push(sessionId);
      }
    });

    for (const sessionId of sessionsToRemove) {
      await this.endVisitorSession(sessionId);
    }

    if (sessionsToRemove.length > 0) {
      console.log(`Cleaned up ${sessionsToRemove.length} inactive sessions`);
    }
  }

  /**
   * Format time duration for display
   */
  static formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Export singleton instance
export const visitorTrackingService = new VisitorTrackingService();