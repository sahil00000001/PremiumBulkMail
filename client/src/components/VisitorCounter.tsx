import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VisitorStats {
  totalVisitors: number;
  activeVisitors: number;
  totalTimeSpent: number;
  averageTimeSpent: number;
  visitorsToday: number;
}

export function VisitorCounter() {
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
    <div className="fixed top-4 right-4 z-50">
      <Card className="w-80 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-800 dark:text-blue-200">
            <Eye className="h-5 w-5" />
            Live Visitor Analytics
            <Badge 
              variant={connected ? "default" : "secondary"} 
              className={`ml-auto text-xs ${connected ? 'bg-green-500' : 'bg-gray-500'}`}
            >
              {connected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Visitors */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Now</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Online visitors</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.activeVisitors}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Visitors</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalVisitors.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {stats.visitorsToday} today
              </p>
            </div>
          </div>

          {/* Time Spent */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Spent</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average session</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatTime(stats.averageTimeSpent)}
              </p>
              <p className="text-xs text-gray-500">
                {formatTime(stats.totalTimeSpent)} total
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {connected ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Real-time updates active
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                  Connecting to live updates...
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}