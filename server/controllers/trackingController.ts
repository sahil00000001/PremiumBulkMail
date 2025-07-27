import { Request, Response } from 'express';
import { trackingUpdateService } from '../services/trackingUpdateService';
import { storage } from '../storage';

export const trackingController = {
  // Force update tracking for a specific email
  updateSingleTracking: async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      
      if (!trackingId) {
        return res.status(400).json({ message: 'Tracking ID is required' });
      }
      
      const wasUpdated = await trackingUpdateService.updateSingleEmailTracking(trackingId);
      
      return res.status(200).json({
        success: true,
        updated: wasUpdated,
        message: wasUpdated ? 'Tracking status updated' : 'No update needed'
      });
    } catch (error) {
      console.error('Error updating single tracking:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update tracking'
      });
    }
  },

  // Force update all tracking for a batch
  updateBatchTracking: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      // Check if batch exists first
      const batch = await storage.getBatch(batchId);
      if (!batch) {
        return res.status(200).json({
          success: true,
          message: 'Batch not found - tracking skipped'
        });
      }
      
      await trackingUpdateService.updateBatchTrackingStatus(batchId);
      
      return res.status(200).json({
        success: true,
        message: 'Batch tracking updated'
      });
    } catch (error) {
      console.error('Error updating batch tracking:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update batch tracking'
      });
    }
  },

  // Get tracking update summary
  getTrackingSummary: async (req: Request, res: Response) => {
    try {
      const summary = await trackingUpdateService.getTrackingUpdateSummary();
      
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting tracking summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get tracking summary'
      });
    }
  }
};