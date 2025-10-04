import { Request, Response } from 'express';
import { EmailSender } from '../mailer/emailSender';
import { getEmailTemplate } from '../template/emailTemplate';
import { storage } from '../storage';
import { credentialsSchema, Recipient } from '@shared/schema';
import { EmailTemplateProcessor } from '../utils/emailTemplate';
import { pixelTrackingService } from '../services/pixelTrackingService';
import { trackingUpdateService } from '../services/trackingUpdateService';
import { v4 as uuidv4 } from 'uuid';

// Store active email sending sessions
interface EmailSendingSession {
  batchId: string;
  credentials: any;
  startTime: Date;
  inProgress: boolean;
  totalEmails: number;
  successCount: number;
  failureCount: number;
}

const activeSessions = new Map<string, EmailSendingSession>();

// Process emails for a batch
async function processEmails(batchId: string, credentials: any, recipients: any[]) {
  try {
    // Get batch info for template
    const batch = await storage.getBatch(batchId);
    if (!batch || !batch.template || !batch.subject) {
      throw new Error('Batch template not found. Please set up your email template first.');
    }
    
    // Initialize email sender with credentials
    const emailSender = new EmailSender(credentials);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process emails one by one with delay
    for (let i = 0; i < recipients.length; i++) {
      try {
        const recipient = recipients[i];
        
        console.log(`Sending email to ${recipient.email}...`);
        
        // Parse recipient data from JSON
        const recipientData = JSON.parse(recipient.data);
        
        // Send email with dynamic template
        const result = await emailSender.sendEmail(
          recipient.email,
          recipientData,
          batch.template,
          batch.subject,
          batch.signature || undefined,
          batch.isHtmlMode === true // Explicitly check for true to handle null/undefined
        );
        
        // Update recipient status and tracking ID
        const newStatus = result.success ? 'sent' : 'failed';
        await storage.updateRecipientStatus(recipient.id, newStatus);
        
        // If email was sent successfully, store tracking ID
        if (result.success && result.trackingId) {
          await storage.updateRecipientTrackingId(recipient.id, result.trackingId);
        }
        
        // Update batch count
        await storage.updateBatchSentCount(batchId, result.success);
        
        if (result.success) {
          successCount++;
          console.log(`Email to ${recipient.email} sent successfully with tracking ID: ${result.trackingId}`);
        } else {
          failureCount++;
          console.log(`Failed to send email to ${recipient.email}`);
        }
        
        // Update session
        const session = activeSessions.get(batchId);
        if (session) {
          session.successCount = successCount;
          session.failureCount = failureCount;
          activeSessions.set(batchId, session);
        }
        
        // Wait for 2 seconds before sending the next email (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error sending email to ${recipients[i].email}:`, error);
        
        // Update batch with failure
        await storage.updateBatchSentCount(batchId, false);
        failureCount++;
        
        // Update session
        const session = activeSessions.get(batchId);
        if (session) {
          session.failureCount = failureCount;
          activeSessions.set(batchId, session);
        }
      }
    }
    
    // Mark session as completed
    const session = activeSessions.get(batchId);
    if (session) {
      session.inProgress = false;
      activeSessions.set(batchId, session);
    }
    
    console.log(`Email sending completed for batch ${batchId}. Success: ${successCount}, Failed: ${failureCount}`);
  } catch (error) {
    console.error(`Error in email sending process for batch ${batchId}:`, error);
    
    // Mark session as completed
    const session = activeSessions.get(batchId);
    if (session) {
      session.inProgress = false;
      activeSessions.set(batchId, session);
    }
  }
}

export const emailController = {
  // Test email credentials before sending
  testCredentials: async (req: Request, res: Response) => {
    try {
      const { credentials } = req.body;
      
      console.log('Testing Gmail credentials...');
      
      // Validate credentials
      const validatedCredentials = credentialsSchema.parse(credentials);
      
      // Initialize email sender with credentials
      const emailSender = new EmailSender(validatedCredentials);
      
      // Just verify the transporter without sending an actual email
      const isVerified = await emailSender['verifyTransporter']();
      
      if (isVerified) {
        return res.status(200).json({ 
          success: true,
          message: 'Gmail credentials verified successfully! You can now send emails.' 
        });
      } else {
        return res.status(400).json({ 
          success: false,
          message: 'Failed to verify Gmail credentials. Make sure you are using an App Password, not your regular Gmail password.',
          details: 'Gmail blocks regular passwords for security reasons. Please generate an App Password from your Google Account.'
        });
      }
    } catch (error: any) {
      console.error('Error testing credentials:', error);
      return res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to test credentials',
        details: 'There was an error testing your Gmail credentials.' 
      });
    }
  },
  
  // Initialize email sending process
  initiateSendEmails: async (req: Request, res: Response) => {
    try {
      const { credentials, batchId } = req.body;
      
      console.log(`Starting email sending process for batch: ${batchId}`);
      
      // Validate credentials
      const validatedCredentials = credentialsSchema.parse(credentials);
      
      // Get batch and recipients
      const batch = await storage.getBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      const recipients = await storage.getRecipientsByBatchId(batchId);
      if (recipients.length === 0) {
        return res.status(404).json({ message: 'No recipients found for this batch' });
      }
      
      // Create session
      const session: EmailSendingSession = {
        batchId,
        credentials: validatedCredentials,
        startTime: new Date(),
        inProgress: true,
        totalEmails: recipients.length,
        successCount: 0,
        failureCount: 0
      };
      
      activeSessions.set(batchId, session);
      
      // Start email sending process in background
      processEmails(batchId, validatedCredentials, recipients);
      
      return res.status(200).json({ 
        message: 'Email sending initialized successfully',
        batchId,
        totalEmails: recipients.length
      });
    } catch (error) {
      console.error('Error initializing email sending:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to initialize email sending' 
      });
    }
  },
  
  // SSE endpoint to track email sending progress
  emailSendingStatus: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.query;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      // Get the session or create a temporary one if doesn't exist
      let session = activeSessions.get(batchId as string);
      
      if (!session) {
        // Try to create a temporary session based on the batch data
        const batch = await storage.getBatch(batchId as string);
        if (!batch) {
          return res.status(404).json({ message: 'Batch not found' });
        }
        
        const recipients = await storage.getRecipientsByBatchId(batchId as string);
        const sent = recipients.filter(r => r.status === 'sent').length;
        const failed = recipients.filter(r => r.status === 'failed').length;
        
        // Create temporary session
        session = {
          batchId: batchId as string,
          credentials: null,
          startTime: new Date(),
          inProgress: sent + failed < recipients.length,
          totalEmails: recipients.length,
          successCount: sent,
          failureCount: failed
        };
        
        activeSessions.set(batchId as string, session);
      }
      
      // Create Server-Sent Events connection
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send initial batch info
      res.write(`data: ${JSON.stringify({
        type: 'init',
        totalEmails: session.totalEmails,
        sent: session.successCount,
        failed: session.failureCount
      })}\n\n`);
      
      // Add response to recipients of updates
      const sessionId = batchId as string;
      const interval = setInterval(async () => {
        const currentSession = activeSessions.get(sessionId);
        
        if (!currentSession) {
          clearInterval(interval);
          return;
        }
        
        // Get latest recipient status
        const recipients = await storage.getRecipientsByBatchId(sessionId);
        
        // Send status update periodically
        res.write(`data: ${JSON.stringify({
          type: 'status',
          sent: currentSession.successCount,
          failed: currentSession.failureCount,
          total: currentSession.totalEmails,
          recipients: recipients.map(r => ({
            email: r.email,
            status: r.status
          }))
        })}\n\n`);
        
        // Check if completed
        if (!currentSession.inProgress) {
          // Send completion event
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            sent: currentSession.successCount,
            failed: currentSession.failureCount,
            total: currentSession.totalEmails
          })}\n\n`);
          
          // Cleanup session after some time
          setTimeout(() => {
            activeSessions.delete(sessionId);
          }, 3600000); // Remove after an hour
          
          clearInterval(interval);
          res.end();
        }
      }, 2000);
      
      // Handle client disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
    } catch (error) {
      console.error('Error in email status stream:', error);
      return res.status(500).json({ message: 'Failed to track email sending' });
    }
  },
  
  getBatchSummary: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      const batch = await storage.getBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      const recipients = await storage.getRecipientsByBatchId(batchId);
      
      // Count statuses
      const sent = recipients.filter(r => r.status === 'sent').length;
      const failed = recipients.filter(r => r.status === 'failed').length;
      const pending = recipients.filter(r => r.status === 'pending').length;
      
      return res.status(200).json({
        batchId,
        total: recipients.length,
        sent,
        failed,
        pending,
        senderName: batch.senderName,
        senderEmail: batch.senderEmail,
        createdAt: batch.createdAt
      });
    } catch (error) {
      console.error('Error fetching batch summary:', error);
      return res.status(500).json({ message: 'Failed to fetch batch summary' });
    }
  },

  // Email tracking pixel endpoint
  trackEmailOpen: async (req: Request, res: Response) => {
    try {
      const { trackingId } = req.params;
      
      if (trackingId) {
        // Log email open event
        await storage.updateRecipientTracking(trackingId, new Date().toISOString());
        console.log(`Email opened - Tracking ID: ${trackingId}`);
      }
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pixel);
    } catch (error) {
      console.error('Error tracking email open:', error);
      // Still return pixel even on error
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.setHeader('Content-Type', 'image/gif');
      res.send(pixel);
    }
  },

  // Save email template
  saveTemplate: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      const { template, subject } = req.body;
      
      if (!batchId || !template || !subject) {
        return res.status(400).json({ message: 'Batch ID, template, and subject are required' });
      }
      
      await storage.updateBatchTemplate(batchId, template, subject);
      
      return res.status(200).json({ message: 'Template saved successfully' });
    } catch (error) {
      console.error('Error saving template:', error);
      return res.status(500).json({ message: 'Failed to save template' });
    }
  },

  // Get email template
  getTemplate: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      const batch = await storage.getBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      return res.status(200).json({
        template: batch.template || '',
        subject: batch.subject || '',
        columns: JSON.parse(batch.columns || '[]'),
        emailColumn: batch.emailColumn
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      return res.status(500).json({ message: 'Failed to fetch template' });
    }
  },

  // Get pixel tracking analytics for a specific email
  getPixelAnalytics: async (req: Request, res: Response) => {
    try {
      const { pixelId } = req.params;
      
      if (!pixelId) {
        return res.status(400).json({ message: 'Pixel ID is required' });
      }
      
      console.log(`Fetching analytics for pixel ID: ${pixelId}`);
      const analytics = await pixelTrackingService.checkPixelStatus(pixelId);
      
      return res.status(200).json(analytics);
    } catch (error) {
      console.error('Error fetching pixel analytics:', error);
      return res.status(500).json({ message: 'Failed to fetch pixel analytics' });
    }
  },

  // Get tracking analytics for a batch
  getBatchTrackingAnalytics: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      const recipients = await storage.getRecipientsByBatchId(batchId);
      
      // Get analytics for each recipient with tracking ID
      const analyticsPromises = recipients
        .filter(r => r.trackingId)
        .map(async (recipient) => {
          try {
            const analytics = await pixelTrackingService.checkPixelStatus(recipient.trackingId!);
            return {
              email: recipient.email,
              trackingId: recipient.trackingId,
              ...analytics
            };
          } catch (error) {
            console.error(`Failed to get analytics for ${recipient.email}:`, error);
            return {
              email: recipient.email,
              trackingId: recipient.trackingId,
              opened: false,
              viewCount: 0,
              totalViewTime: 0,
              message: 'Failed to retrieve analytics'
            };
          }
        });
      
      const trackingData = await Promise.all(analyticsPromises);
      
      // Calculate batch statistics
      const totalTracked = trackingData.length;
      const totalOpened = trackingData.filter(t => t.opened).length;
      const openRate = totalTracked > 0 ? (totalOpened / totalTracked) * 100 : 0;
      const averageViewTime = totalTracked > 0 
        ? trackingData.reduce((sum, t) => sum + (t.totalViewTime || 0), 0) / totalTracked 
        : 0;
      
      return res.status(200).json({
        batchId,
        totalEmails: recipients.length,
        totalTracked,
        totalOpened,
        openRate: Math.round(openRate * 100) / 100,
        averageViewTime: Math.round(averageViewTime),
        recipients: trackingData
      });
    } catch (error) {
      console.error('Error fetching batch tracking analytics:', error);
      return res.status(500).json({ message: 'Failed to fetch batch tracking analytics' });
    }
  },

  // Get global dashboard statistics
  getGlobalDashboard: async (req: Request, res: Response) => {
    try {
      console.log('Fetching global dashboard statistics...');
      const dashboardStats = await pixelTrackingService.getDashboardStats();
      
      return res.status(200).json(dashboardStats);
    } catch (error) {
      console.error('Error fetching global dashboard:', error);
      return res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
  },

  // Force refresh tracking data for a batch
  forceRefreshTracking: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: 'Batch ID is required' });
      }
      
      console.log(`Force refreshing tracking data for batch: ${batchId}`);
      
      // Check if batch exists first
      const batch = await storage.getBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      await trackingUpdateService.updateBatchTrackingStatus(batchId);
      
      return res.status(200).json({ 
        message: 'Tracking data refreshed successfully',
        batchId 
      });
    } catch (error) {
      console.error('Error force refreshing tracking data:', error);
      return res.status(500).json({ message: 'Failed to refresh tracking data' });
    }
  }
};
