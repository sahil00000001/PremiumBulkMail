import { 
  emails, 
  batches, 
  websiteVisitors,
  type User, 
  type InsertUser, 
  type Email, 
  type InsertEmail, 
  type Batch,
  type InsertBatch,
  type Visitor,
  type InsertVisitor
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Email related methods
  createBatch(batch: InsertBatch): Promise<Batch>;
  getBatch(batchId: string): Promise<Batch | undefined>;
  updateBatchSentCount(batchId: string, success: boolean): Promise<void>;
  
  // Recipients related methods
  saveRecipients(recipients: InsertEmail[]): Promise<Email[]>;
  getRecipientsByBatchId(batchId: string): Promise<Email[]>;
  updateRecipientStatus(id: number, status: string): Promise<void>;
  updateRecipientTracking(trackingId: string, openedAt: string): Promise<void>;
  updateRecipientTrackingId(id: number, trackingId: string): Promise<void>;
  updateRecipientEngagement(trackingId: string, openedAt: string, viewCount: number, totalViewTime: number, lastSeenAt?: string): Promise<void>;
  getRecipientByTrackingId(trackingId: string): Promise<Email | undefined>;
  
  // Template related methods
  updateBatchTemplate(batchId: string, template: string, subject: string): Promise<void>;
  
  // Visitor tracking methods
  createVisitorSession(visitor: InsertVisitor): Promise<Visitor>;
  updateVisitorActivity(sessionId: string, lastSeenAt: string, timeSpentMs: number): Promise<void>;
  endVisitorSession(sessionId: string, lastSeenAt: string, timeSpentMs: number): Promise<void>;
  getAllVisitors(): Promise<Visitor[]>;
  getActiveVisitors(): Promise<Visitor[]>;
  
  // Batch management methods
  getAllBatches?(): Promise<Batch[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private emailsMap: Map<number, Email>;
  private batchesMap: Map<string, Batch>;
  private visitorsMap: Map<string, Visitor>;
  currentUserId: number;
  currentEmailId: number;
  currentBatchId: number;
  currentVisitorId: number;

  constructor() {
    this.users = new Map();
    this.emailsMap = new Map();
    this.batchesMap = new Map();
    this.visitorsMap = new Map();
    this.currentUserId = 1;
    this.currentEmailId = 1;
    this.currentBatchId = 1;
    this.currentVisitorId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const id = this.currentBatchId++;
    const batch: Batch = { 
      ...insertBatch, 
      id,
      sentEmails: insertBatch.sentEmails || 0,
      failedEmails: insertBatch.failedEmails || 0,
      template: insertBatch.template || null,
      subject: insertBatch.subject || null
    };
    this.batchesMap.set(insertBatch.batchId, batch);
    return batch;
  }

  async getBatch(batchId: string): Promise<Batch | undefined> {
    return this.batchesMap.get(batchId);
  }

  async updateBatchSentCount(batchId: string, success: boolean): Promise<void> {
    const batch = this.batchesMap.get(batchId);
    if (batch) {
      if (success) {
        batch.sentEmails += 1;
      } else {
        batch.failedEmails += 1;
      }
      this.batchesMap.set(batchId, batch);
    }
  }

  async saveRecipients(insertEmails: InsertEmail[]): Promise<Email[]> {
    const savedEmails: Email[] = [];
    
    for (const insertEmail of insertEmails) {
      const id = this.currentEmailId++;
      const email: Email = { 
        ...insertEmail, 
        id,
        status: insertEmail.status || 'pending',
        trackingId: insertEmail.trackingId || null,
        openedAt: insertEmail.openedAt || null,
        lastSeenAt: insertEmail.lastSeenAt || null,
        viewCount: insertEmail.viewCount || null,
        totalViewTime: insertEmail.totalViewTime || null
      };
      this.emailsMap.set(id, email);
      savedEmails.push(email);
    }
    
    return savedEmails;
  }

  async getRecipientsByBatchId(batchId: string): Promise<Email[]> {
    return Array.from(this.emailsMap.values()).filter(
      (email) => email.batchId === batchId
    );
  }

  async updateRecipientStatus(id: number, status: string): Promise<void> {
    const email = this.emailsMap.get(id);
    if (email) {
      email.status = status;
      this.emailsMap.set(id, email);
    }
  }

  async updateRecipientTracking(trackingId: string, openedAt: string): Promise<void> {
    const email = Array.from(this.emailsMap.values()).find(e => e.trackingId === trackingId);
    if (email) {
      console.log(`Updating tracking for ${trackingId}: ${email.email} opened at ${openedAt}`);
      email.openedAt = openedAt;
      this.emailsMap.set(email.id, email);
      console.log(`Successfully updated tracking for ${email.email} - Batch: ${email.batchId}`);
    } else {
      console.log(`No email found with tracking ID: ${trackingId}`);
      console.log(`Available tracking IDs:`, Array.from(this.emailsMap.values()).map(e => e.trackingId));
    }
  }

  async getRecipientByTrackingId(trackingId: string): Promise<Email | undefined> {
    return Array.from(this.emailsMap.values()).find(e => e.trackingId === trackingId);
  }

  async updateRecipientTrackingId(id: number, trackingId: string): Promise<void> {
    const email = this.emailsMap.get(id);
    if (email) {
      email.trackingId = trackingId;
      this.emailsMap.set(id, email);
    }
  }

  async updateRecipientEngagement(trackingId: string, openedAt: string, viewCount: number, totalViewTime: number, lastSeenAt?: string): Promise<void> {
    const email = Array.from(this.emailsMap.values()).find(e => e.trackingId === trackingId);
    if (email) {
      email.openedAt = openedAt;
      email.viewCount = viewCount;
      email.totalViewTime = totalViewTime;
      if (lastSeenAt) {
        email.lastSeenAt = lastSeenAt;
      }
      this.emailsMap.set(email.id!, email);
    }
  }

  async updateBatchTemplate(batchId: string, template: string, subject: string): Promise<void> {
    const batch = this.batchesMap.get(batchId);
    if (batch) {
      batch.template = template;
      batch.subject = subject;
      this.batchesMap.set(batchId, batch);
    }
  }

  // Visitor tracking methods
  async createVisitorSession(insertVisitor: InsertVisitor): Promise<Visitor> {
    const id = this.currentVisitorId++;
    const visitor: Visitor = { 
      ...insertVisitor, 
      id,
      ipAddress: insertVisitor.ipAddress || null,
      userAgent: insertVisitor.userAgent || null,
      timeSpentMs: insertVisitor.timeSpentMs || 0,
      isActive: insertVisitor.isActive !== undefined ? insertVisitor.isActive : true
    };
    this.visitorsMap.set(insertVisitor.sessionId, visitor);
    return visitor;
  }

  async updateVisitorActivity(sessionId: string, lastSeenAt: string, timeSpentMs: number): Promise<void> {
    const visitor = this.visitorsMap.get(sessionId);
    if (visitor) {
      visitor.lastSeenAt = lastSeenAt;
      visitor.timeSpentMs = timeSpentMs;
      this.visitorsMap.set(sessionId, visitor);
    }
  }

  async endVisitorSession(sessionId: string, lastSeenAt: string, timeSpentMs: number): Promise<void> {
    const visitor = this.visitorsMap.get(sessionId);
    if (visitor) {
      visitor.lastSeenAt = lastSeenAt;
      visitor.timeSpentMs = timeSpentMs;
      visitor.isActive = false;
      this.visitorsMap.set(sessionId, visitor);
    }
  }

  async getAllVisitors(): Promise<Visitor[]> {
    return Array.from(this.visitorsMap.values());
  }

  async getActiveVisitors(): Promise<Visitor[]> {
    return Array.from(this.visitorsMap.values()).filter(v => v.isActive);
  }

  // Get all batches for tracking updates
  async getAllBatches(): Promise<Batch[]> {
    return Array.from(this.batchesMap.values());
  }
}

export const storage = new MemStorage();
