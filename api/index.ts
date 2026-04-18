// Vercel serverless entry point.
import { init } from "../server/index.js";

console.log('[api/index] Module loaded');

let appPromise: Promise<any>;
try {
  appPromise = init;
  console.log('[api/index] init promise obtained');
} catch (e: any) {
  console.error('[api/index] FATAL: init threw synchronously:', e?.message, e?.stack);
  appPromise = Promise.reject(e);
}

export default async function handler(req: any, res: any) {
  console.log(`[handler] ${req.method} ${req.url}`);
  try {
    const app = await appPromise;
    console.log('[handler] app resolved, handling request');
    app(req, res);
  } catch (e: any) {
    console.error('[handler] FATAL: app init failed:', e?.message, e?.stack);
    res.status(500).json({ error: 'Server initialization failed', detail: e?.message });
  }
}
