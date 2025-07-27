import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import multer from "multer";
import { visitorTrackingService } from "./services/visitorTrackingService";
import { uploadController } from "./controllers/uploadController";
import { emailController } from "./controllers/emailController";
import { visitorController } from "./controllers/visitorController";
import { trackingController } from "./controllers/trackingController";
import { saveTemplate, getTemplate } from "./routes/templateRoutes";
import { trackingUpdateService } from "./services/trackingUpdateService";

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

  // Email tracking pixel endpoint (legacy for existing emails)
  app.get('/api/track/:trackingId', emailController.trackEmailOpen);

  // New pixel tracking analytics endpoints
  app.get('/api/pixel/analytics/:pixelId', emailController.getPixelAnalytics);
  app.get('/api/batch/tracking/:batchId', emailController.getBatchTrackingAnalytics);
  app.get('/api/dashboard/global', emailController.getGlobalDashboard);

  // Template management
  app.post('/api/template/:batchId', saveTemplate);
  app.get('/api/template/:batchId', getTemplate);

  // Visitor tracking endpoints
  app.post('/api/visitors/start', visitorController.startSession);
  app.post('/api/visitors/activity', visitorController.updateActivity);
  app.post('/api/visitors/end', visitorController.endSession);
  app.get('/api/visitors/stats', visitorController.getStats);
  app.get('/api/visitors/active', visitorController.getActiveSessions);

  // Manual tracking update endpoints
  app.post('/api/tracking/update/:trackingId', trackingController.updateSingleTracking);
  app.post('/api/tracking/batch/:batchId', trackingController.updateBatchTracking);
  app.get('/api/tracking/summary', trackingController.getTrackingSummary);

  const httpServer = createServer(app);

  // WebSocket server for real-time visitor updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial visitor stats
    visitorTrackingService.getVisitorStats().then(stats => {
      ws.send(JSON.stringify({
        type: 'visitor_stats',
        data: stats
      }));
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast visitor stats every 5 seconds
  setInterval(async () => {
    if (wss.clients.size > 0) {
      try {
        const stats = await visitorTrackingService.getVisitorStats();
        const message = JSON.stringify({
          type: 'visitor_stats',
          data: stats
        });
        
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        });
      } catch (error) {
        console.error('Error broadcasting visitor stats:', error);
      }
    }
  }, 5000);

  return httpServer;
}
