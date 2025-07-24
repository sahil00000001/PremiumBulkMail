import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadController } from "./controllers/uploadController";
import { emailController } from "./controllers/emailController";
import { saveTemplate, getTemplate } from "./routes/templateRoutes";

// Setup multer for memory storage (for Excel parsing)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload - MIME type:', file.mimetype, 'Original name:', file.originalname);
    
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error(`Only Excel files (.xlsx, .xls) are allowed. Received: ${file.mimetype}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Sample Excel download
  app.get('/api/excel/sample', uploadController.downloadSample);

  // Excel upload
  app.post('/api/excel/upload', upload.single('file'), uploadController.uploadExcel);

  // Get recipients for a batch
  app.get('/api/recipients/:batchId', uploadController.getRecipients);

  // Test Gmail credentials
  app.post('/api/email/test', emailController.testCredentials);

  // Start email sending process
  app.post('/api/send', emailController.initiateSendEmails);

  // Get email sending status (SSE)
  app.get('/api/send/status', emailController.emailSendingStatus);

  // Get batch summary
  app.get('/api/summary/:batchId', emailController.getBatchSummary);

  // Email tracking pixel endpoint
  app.get('/api/track/:trackingId', emailController.trackEmailOpen);

  // Template management
  app.post('/api/template/:batchId', saveTemplate);
  app.get('/api/template/:batchId', getTemplate);

  const httpServer = createServer(app);

  return httpServer;
}
