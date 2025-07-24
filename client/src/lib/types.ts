export type Recipient = {
  email: string;
  data: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  trackingId?: string;
  openedAt?: string;
};

export type Credentials = {
  fullName: string;
  email: string;
  password: string;
};

export type EmailBatch = {
  batchId: string;
  senderName: string;
  senderEmail: string;
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  createdAt: string;
  columns?: string[];
  emailColumn?: string;
  template?: string;
  subject?: string;
};

export type ExcelUploadResult = {
  message: string;
  batchId: string;
  columns: string[];
  emailColumn: string;
  recipients: Array<{
    email: string;
    data: Record<string, any>;
    status: string;
  }>;
};
