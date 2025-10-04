import { Request, Response } from 'express';
import { storage } from '../storage';
import { EmailTemplateProcessor } from '../utils/emailTemplate';

// Save email template for a batch
export const saveTemplate = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { subject, template, signature, isHtmlMode } = req.body;

    if (!subject || !template) {
      return res.status(400).json({ error: 'Subject and template are required' });
    }

    // Get batch data to validate template
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get recipients to validate template variables
    const recipients = await storage.getRecipientsByBatchId(batchId);
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found for this batch' });
    }

    // Extract available columns from first recipient
    // The data is stored as JSON string, so we need to parse it
    const firstRecipientData = typeof recipients[0].data === 'string' 
      ? JSON.parse(recipients[0].data) 
      : recipients[0].data;
    
    const availableColumns = Object.keys(firstRecipientData);
    
    console.log('Template validation:', { template, subject, signature, isHtmlMode, availableColumns });

    // Update batch with template
    await storage.updateBatchTemplate(batchId, template, subject, signature, isHtmlMode);

    res.json({ 
      success: true, 
      message: 'Template saved successfully'
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
};

// Get template for a batch
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({
      subject: batch.subject || '',
      template: batch.template || '',
      signature: batch.signature || '',
      isHtmlMode: batch.isHtmlMode === true // Explicitly return boolean based on true value
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
};