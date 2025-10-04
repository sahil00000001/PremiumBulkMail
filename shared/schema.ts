import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  data: text("data").notNull(), // JSON string containing all column data
  status: text("status").notNull().default("pending"),
  batchId: text("batch_id").notNull(),
  trackingId: text("tracking_id"), // For email tracking
  openedAt: text("opened_at"), // When email was opened
  lastSeenAt: text("last_seen_at"), // Last time email was viewed
  viewCount: integer("view_count").default(0), // Number of times viewed
  totalViewTime: integer("total_view_time").default(0), // Total engagement time in milliseconds
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  totalEmails: integer("total_emails").notNull(),
  sentEmails: integer("sent_emails").notNull().default(0),
  failedEmails: integer("failed_emails").notNull().default(0),
  createdAt: text("created_at").notNull(),
  columns: text("columns").notNull(), // JSON array of column names
  emailColumn: text("email_column").notNull(), // Which column contains emails
  template: text("template"), // Email template with @ variables
  subject: text("subject"), // Email subject with @ variables
  signature: text("signature"), // Optional email signature
  isHtmlMode: boolean("is_html_mode").default(false), // Whether template is HTML or plain text
});

export const websiteVisitors = pgTable("website_visitors", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  visitedAt: text("visited_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  timeSpentMs: integer("time_spent_ms").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEmailSchema = createInsertSchema(emails).pick({
  email: true,
  data: true,
  status: true,  
  batchId: true,
  trackingId: true,
  openedAt: true,
  lastSeenAt: true,
  viewCount: true,
  totalViewTime: true,
});

export const insertBatchSchema = createInsertSchema(batches).pick({
  batchId: true,
  senderName: true,
  senderEmail: true,
  totalEmails: true,
  sentEmails: true,
  failedEmails: true,
  createdAt: true,
  columns: true,
  emailColumn: true,
  template: true,
  subject: true,
  signature: true,
  isHtmlMode: true,
});

export const insertVisitorSchema = createInsertSchema(websiteVisitors).pick({
  sessionId: true,
  ipAddress: true,
  userAgent: true,
  visitedAt: true,
  lastSeenAt: true,
  timeSpentMs: true,
  isActive: true,
});

export const credentialsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").refine(
    (email) => email.endsWith("@gmail.com"),
    "Only Gmail addresses are supported"
  ),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batches.$inferSelect;

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof websiteVisitors.$inferSelect;

export type Credentials = z.infer<typeof credentialsSchema>;

export type Recipient = {
  email: string;
  data: Record<string, any>; // Dynamic data from Excel
  status: string;
  trackingId?: string;
  openedAt?: string;
};

export type ExcelParseResult = {
  columns: string[];
  emailColumn: string;
  recipients: Array<{
    email: string;
    data: Record<string, any>;
  }>;
};

export type EmailTemplate = {
  subject: string;
  body: string;
};
