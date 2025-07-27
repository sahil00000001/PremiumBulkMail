import { v4 as uuidv4 } from 'uuid';

export class EmailTemplateProcessor {
  static processTemplate(
    template: string,
    subject: string,
    recipientData: Record<string, any>
  ): { subject: string; body: string; trackingId: string } {
    // Generate unique tracking ID for this email
    const trackingId = uuidv4();
    
    // IMPORTANT: This is your ngrok URL - update this when ngrok gives you a new URL
    const baseUrl = 'https://9357cac0e613.ngrok-free.app';
    
    // Log for debugging
    console.log(`Using base URL for tracking: ${baseUrl}`);
    console.log(`Generated tracking ID: ${trackingId}`);
    
    // Process template variables - replace @variable with actual data
    let processedBody = template;
    let processedSubject = subject;
    
    // Replace all @variables with actual data
    Object.keys(recipientData).forEach(key => {
      const regex = new RegExp(`@${key}`, 'g');
      processedBody = processedBody.replace(regex, recipientData[key] || '');
      processedSubject = processedSubject.replace(regex, recipientData[key] || '');
    });
    
    // Add tracking pixel at the end of the email
    const trackingPixel = `<img src="${baseUrl}/api/track/${trackingId}?ngrok-skip-browser-warning=true" width="1" height="1" style="display:none;opacity:0;visibility:hidden;" alt="" border="0">`;
    // Wrap in proper HTML structure
    const htmlBody = `<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${processedBody}
  ${trackingPixel}
</body>
</html>`;
    
    console.log(`Email prepared with tracking ID: ${trackingId}`);
    console.log(`Tracking pixel URL: ${baseUrl}/api/track/${trackingId}`);
    
    return {
      subject: processedSubject,
      body: htmlBody,
      trackingId
    };
  }
}