import { storage } from '../storage';
import { pixelTrackingService } from './pixelTrackingService';

export class TrackingUpdateService {
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = 10000; // Check every 10 seconds

  constructor() {
    this.startPeriodicUpdates();
  }

  /**
   * Start periodic tracking updates
   */
  startPeriodicUpdates() {
    console.log('Starting periodic tracking updates every 10 seconds');
    
    this.updateInterval = setInterval(async () => {
      await this.updateAllTrackingStatuses();
    }, this.UPDATE_INTERVAL_MS);
  }

  /**
   * Stop periodic tracking updates
   */
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Stopped periodic tracking updates');
    }
  }

  /**
   * Update tracking statuses for all emails with tracking IDs
   */
  async updateAllTrackingStatuses(): Promise<void> {
    try {
      // Get all batches to find emails with tracking IDs
      const batches = await storage.getAllBatches?.() || [];
      
      for (const batch of batches) {
        await this.updateBatchTrackingStatus(batch.batchId);
      }
    } catch (error) {
      console.error('Error in periodic tracking update:', error);
    }
  }

  /**
   * Update tracking status for a specific batch
   */
  async updateBatchTrackingStatus(batchId: string): Promise<void> {
    try {
      const recipients = await storage.getRecipientsByBatchId(batchId);
      
      // Only check emails that have tracking IDs and are not already marked as opened
      const trackableEmails = recipients.filter(r => 
        r.trackingId && 
        r.status === 'sent' && 
        !r.openedAt
      );

      if (trackableEmails.length === 0) {
        return;
      }

      console.log(`Checking tracking status for ${trackableEmails.length} emails in batch ${batchId}`);

      // Check tracking status for each email
      const updatePromises = trackableEmails.map(async (recipient) => {
        try {
          const trackingStatus = await pixelTrackingService.checkPixelStatus(recipient.trackingId!);
          
          if (trackingStatus.opened && !recipient.openedAt) {
            // Update recipient with full engagement data
            console.log(`Email opened detected: ${recipient.email} (${recipient.trackingId}) - ${trackingStatus.viewCount} views, ${trackingStatus.totalViewTime}ms view time`);
            await storage.updateRecipientEngagement(
              recipient.trackingId!, 
              trackingStatus.openedAt || new Date().toISOString(),
              trackingStatus.viewCount,
              trackingStatus.totalViewTime,
              trackingStatus.lastSeenAt
            );
            return true; // Indicates an update was made
          } else if (trackingStatus.opened && recipient.openedAt) {
            // Update engagement metrics if there are changes
            if (recipient.viewCount !== trackingStatus.viewCount || recipient.totalViewTime !== trackingStatus.totalViewTime) {
              console.log(`Updating engagement metrics for ${recipient.email}: ${trackingStatus.viewCount} views, ${trackingStatus.totalViewTime}ms`);
              await storage.updateRecipientEngagement(
                recipient.trackingId!, 
                recipient.openedAt,
                trackingStatus.viewCount,
                trackingStatus.totalViewTime,
                trackingStatus.lastSeenAt
              );
              return true;
            }
          }
        } catch (error) {
          console.error(`Failed to check tracking for ${recipient.email}:`, error);
        }
        return false;
      });

      const results = await Promise.all(updatePromises);
      const updatedCount = results.filter(Boolean).length;
      
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} email open statuses for batch ${batchId}`);
      }

    } catch (error) {
      console.error(`Error updating tracking status for batch ${batchId}:`, error);
    }
  }

  /**
   * Force update tracking status for a specific email
   */
  async updateSingleEmailTracking(trackingId: string): Promise<boolean> {
    try {
      const trackingStatus = await pixelTrackingService.checkPixelStatus(trackingId);
      
      if (trackingStatus.opened) {
        await storage.updateRecipientEngagement(
          trackingId,
          trackingStatus.openedAt || new Date().toISOString(),
          trackingStatus.viewCount,
          trackingStatus.totalViewTime,
          trackingStatus.lastSeenAt
        );
        console.log(`Manually updated tracking status for ${trackingId} - ${trackingStatus.viewCount} views, ${trackingStatus.totalViewTime}ms`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to manually update tracking for ${trackingId}:`, error);
      return false;
    }
  }

  /**
   * Get summary of tracking updates
   */
  async getTrackingUpdateSummary(): Promise<{
    totalTracked: number;
    totalOpened: number;
    recentOpens: Array<{ email: string; openedAt: string; trackingId: string }>
  }> {
    try {
      // This would need to be implemented based on your storage structure
      // For now, return basic stats
      return {
        totalTracked: 0,
        totalOpened: 0,
        recentOpens: []
      };
    } catch (error) {
      console.error('Error getting tracking update summary:', error);
      return {
        totalTracked: 0,
        totalOpened: 0,
        recentOpens: []
      };
    }
  }
}

// Export singleton instance
export const trackingUpdateService = new TrackingUpdateService();