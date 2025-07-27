import { Request, Response } from 'express';
import { visitorTrackingService } from '../services/visitorTrackingService';

export const visitorController = {
  // Start a new visitor session
  startSession: async (req: Request, res: Response) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      const sessionId = await visitorTrackingService.startVisitorSession(ipAddress, userAgent);
      
      return res.status(200).json({
        success: true,
        sessionId,
        message: 'Visitor session started'
      });
    } catch (error) {
      console.error('Error starting visitor session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to start visitor session'
      });
    }
  },

  // Update visitor activity (heartbeat)
  updateActivity: async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      await visitorTrackingService.updateVisitorActivity(sessionId);
      
      return res.status(200).json({
        success: true,
        message: 'Activity updated'
      });
    } catch (error) {
      console.error('Error updating visitor activity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update activity'
      });
    }
  },

  // End visitor session
  endSession: async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      await visitorTrackingService.endVisitorSession(sessionId);
      
      return res.status(200).json({
        success: true,
        message: 'Session ended'
      });
    } catch (error) {
      console.error('Error ending visitor session:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to end session'
      });
    }
  },

  // Get visitor statistics
  getStats: async (req: Request, res: Response) => {
    try {
      const stats = await visitorTrackingService.getVisitorStats();
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting visitor stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get visitor statistics'
      });
    }
  },

  // Get active sessions for real-time display
  getActiveSessions: async (req: Request, res: Response) => {
    try {
      const activeSessions = visitorTrackingService.getActiveSessions();
      
      return res.status(200).json({
        success: true,
        data: activeSessions
      });
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get active sessions'
      });
    }
  }
};