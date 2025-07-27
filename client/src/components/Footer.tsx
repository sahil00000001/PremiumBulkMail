import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, TrendingUp, Eye, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VisitorStats {
  totalVisitors: number;
  activeVisitors: number;
  totalTimeSpent: number;
  averageTimeSpent: number;
  visitorsToday: number;
}

export function Footer() {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisitors: 0,
    activeVisitors: 0,
    totalTimeSpent: 0,
    averageTimeSpent: 0,
    visitorsToday: 0
  });
  const [sessionId, setSessionId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const activityInterval = useRef<NodeJS.Timeout | null>(null);

  // Format time duration for display
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Start visitor session
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/visitors/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          console.log('Visitor session started:', data.sessionId);
        }
      } catch (error) {
        console.error('Failed to start visitor session:', error);
      }
    };

    startSession();
  }, []);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for visitor tracking');
        setConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'visitor_stats') {
            setStats(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Send activity heartbeat every 30 seconds
  useEffect(() => {
    if (sessionId) {
      const sendHeartbeat = async () => {
        try {
          await fetch('/api/visitors/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });
        } catch (error) {
          console.error('Failed to send activity heartbeat:', error);
        }
      };

      // Send initial heartbeat
      sendHeartbeat();

      // Setup interval for heartbeats
      activityInterval.current = setInterval(sendHeartbeat, 30000);

      return () => {
        if (activityInterval.current) {
          clearInterval(activityInterval.current);
        }
      };
    }
  }, [sessionId]);

  // End session when page unloads
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (sessionId) {
        // Use sendBeacon for reliable delivery when page unloads
        navigator.sendBeacon('/api/visitors/end', JSON.stringify({ sessionId }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (sessionId) {
        // End session when component unmounts
        fetch('/api/visitors/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        }).catch(console.error);
      }
    };
  }, [sessionId]);

  return (
    <footer className="mt-auto bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mass Marketing Tool</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Professional email marketing platform with advanced tracking and analytics.
            </p>
          </div>

          {/* Live Visitor Stats */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Analytics
              <Badge 
                variant={connected ? "default" : "secondary"} 
                className={`text-xs ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
              >
                {connected ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.activeVisitors}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalVisitors}</p>
              </div>
            </div>
          </div>

          {/* Time Analytics */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Analytics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Session</span>
                <span className="font-semibold text-purple-600">{formatTime(stats.averageTimeSpent)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Visitors Today</span>
                <span className="font-semibold text-orange-600">{stats.visitorsToday}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Contact</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Email: support@massmarketing.com</p>
              <p>Built with passion for email marketing</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <p>&copy; 2025 Mass Marketing Tool. All rights reserved.</p>
              <div className="flex items-center gap-1">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500 fill-current" />
                <span>for email marketers</span>
              </div>
            </div>
            
            {/* Real-time Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {connected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 dark:text-green-400">Real-time updates active</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-500">Connecting to live updates...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}