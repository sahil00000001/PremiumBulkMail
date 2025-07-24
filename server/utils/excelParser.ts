import * as xlsx from 'xlsx';
import { ExcelParseResult } from '@shared/schema';

export class ExcelParser {
  static parseExcelFile(buffer: Buffer): ExcelParseResult {
    try {
      // Read the Excel file
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      // Extract column names from first row
      const firstRow = jsonData[0] as Record<string, any>;
      const columns = Object.keys(firstRow);
      
      // Auto-detect email column
      const emailColumn = this.detectEmailColumn(columns, jsonData);
      
      if (!emailColumn) {
        throw new Error('No email column found. Please ensure your Excel file has a column containing email addresses.');
      }
      
      // Process all rows
      const recipients = [];
      
      for (const row of jsonData) {
        const record = row as Record<string, any>;
        const email = record[emailColumn];
        
        // Validate email format
        if (!email || !this.isValidEmail(email)) {
          console.warn('Skipping row with invalid email:', email);
          continue;
        }
        
        recipients.push({
          email,
          data: record
        });
      }
      
      if (recipients.length === 0) {
        throw new Error('No valid recipients found in the file');
      }
      
      return {
        columns,
        emailColumn,
        recipients
      };
    } catch (error) {
      console.error('Failed to parse Excel file:', error);
      throw error instanceof Error ? error : new Error('Failed to parse Excel file. Please check the format.');
    }
  }
  
  private static detectEmailColumn(columns: string[], data: any[]): string | null {
    // First, look for obvious column names
    const emailKeywords = ['email', 'e-mail', 'mail', 'email_address', 'emailaddress', 'e_mail'];
    
    for (const keyword of emailKeywords) {
      const foundColumn = columns.find(col => 
        col.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundColumn) return foundColumn;
    }
    
    // If no obvious column found, check data for email patterns
    for (const column of columns) {
      let emailCount = 0;
      const sampleSize = Math.min(5, data.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i][column];
        if (value && this.isValidEmail(value)) {
          emailCount++;
        }
      }
      
      // If most sampled values are emails, this is likely the email column
      if (emailCount >= sampleSize * 0.8) {
        return column;
      }
    }
    
    return null;
  }
  
  private static isValidEmail(email: string): boolean {
    return typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);
  }
  
  static generateSampleExcel(): Buffer {
    const worksheet = xlsx.utils.json_to_sheet([
      { Name: 'Sahil', Email: 'sahil@gmail.com', role: 'Software Developer', Company: 'Fortek' },
      { Name: 'Alex', Email: 'alex@gmail.com', role: 'Product Manager', Company: 'TechCorp' },
      { Name: 'Maria', Email: 'maria@gmail.com', role: 'Marketing Director', Company: 'BrandWave' }
    ]);
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Recipients');
    
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
