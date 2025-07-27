import { pixelTrackingService } from '../services/pixelTrackingService';

export class EmailTemplateProcessor {
  static async processTemplate(
    template: string,
    subject: string,
    recipientData: Record<string, any>
  ): Promise<{ subject: string; body: string; trackingId: string }> {
    // Process template variables - replace @variable with actual data
    let processedBody = template;
    let processedSubject = subject;
    
    // Replace all @variables with actual data
    Object.keys(recipientData).forEach(key => {
      const regex = new RegExp(`@${key}`, 'g');
      processedBody = processedBody.replace(regex, recipientData[key] || '');
      processedSubject = processedSubject.replace(regex, recipientData[key] || '');
    });
    
    try {
      // Create unique pixel for this email using external API
      console.log('Creating tracking pixel via external API...');
      const pixelData = await pixelTrackingService.createPixel();
      
      console.log(`Pixel created successfully: ID=${pixelData.id}`);
      
      // Wrap in proper HTML structure
      let htmlBody = `<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${processedBody}
</body>
</html>`;
      
      // Embed the tracking pixel using the service
      htmlBody = pixelTrackingService.embedPixelInEmail(htmlBody, pixelData.embedCode);
      
      console.log(`Email prepared with external tracking pixel ID: ${pixelData.id}`);
      
      return {
        subject: processedSubject,
        body: htmlBody,
        trackingId: pixelData.id // Use the pixel ID as tracking ID
      };
    } catch (error) {
      console.error('Failed to create tracking pixel via external API:', error);
      
      // Fallback: create email without tracking
      console.log('Proceeding without tracking pixel...');
      const htmlBody = `<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${processedBody}
</body>
</html>`;
      
      return {
        subject: processedSubject,
        body: htmlBody,
        trackingId: '' // No tracking if pixel creation fails
      };
    }
  }
}