import { v4 as uuidv4 } from 'uuid';

export class EmailTemplateProcessor {
  /**
   * Process email template by replacing @ variables with actual data
   * and adding tracking pixel
   */
  static processTemplate(
    template: string,
    subject: string,
    data: Record<string, any>,
    baseUrl: string = process.env.BASE_URL || 'http://localhost:5000'
  ): { subject: string; body: string; trackingId: string } {
    const trackingId = uuidv4();
    
    // Replace @ variables in subject
    const processedSubject = this.replaceVariables(subject, data);
    
    // Replace @ variables in body
    let processedBody = this.replaceVariables(template, data);
    
    // Add tracking pixel to body
    const trackingPixel = this.generateTrackingPixel(trackingId, baseUrl);
    processedBody += trackingPixel;
    
    return {
      subject: processedSubject,
      body: processedBody,
      trackingId
    };
  }
  
  /**
   * Replace @ variables with actual data values
   */
  private static replaceVariables(text: string, data: Record<string, any>): string {
    return text.replace(/@(\w+)/g, (match, columnName) => {
      const value = data[columnName];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }
  
  /**
   * Generate invisible tracking pixel HTML
   */
  private static generateTrackingPixel(trackingId: string, baseUrl: string): string {
    const trackingUrl = `${baseUrl}/api/track/${trackingId}`;
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="">`;
  }
  
  /**
   * Extract @ variables from template text
   */
  static extractVariables(text: string): string[] {
    const matches = text.match(/@(\w+)/g);
    if (!matches) return [];
    
    // Remove @ prefix and deduplicate
    return Array.from(new Set(matches.map(match => match.substring(1))));
  }
  
  /**
   * Validate that all required variables exist in data
   */
  static validateTemplate(template: string, subject: string, availableColumns: string[]): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const templateVars = this.extractVariables(template);
    const subjectVars = this.extractVariables(subject);
    const allVars = Array.from(new Set([...templateVars, ...subjectVars]));
    
    const missingVariables = allVars.filter(variable => 
      !availableColumns.includes(variable)
    );
    
    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }
  
  /**
   * Generate sample preview of processed template
   */
  static generatePreview(
    template: string,
    subject: string,
    sampleData: Record<string, any>
  ): { subject: string; body: string } {
    const processedSubject = this.replaceVariables(subject, sampleData);
    const processedBody = this.replaceVariables(template, sampleData);
    
    return {
      subject: processedSubject,
      body: processedBody
    };
  }
}