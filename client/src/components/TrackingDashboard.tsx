import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBox from "@/components/StatusBox";
import { MailIcon, MailOpenIcon, AlertCircleIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import { useEmail } from "@/hooks/use-email";

interface TrackingStats {
  total: number;
  sent: number;
  opened: number;
  failed: number;
  pending: number;
  openRate: number;
}

export default function TrackingDashboard() {
  const { recipients, batchId, refreshTrackingData: contextRefresh } = useEmail();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Calculate tracking statistics
  const getTrackingStats = (): TrackingStats => {
    const total = recipients.length;
    const sent = recipients.filter(r => r.status === 'sent').length;
    const opened = recipients.filter(r => r.openedAt).length;
    const failed = recipients.filter(r => r.status === 'failed').length;
    const pending = recipients.filter(r => r.status === 'pending').length;
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;

    return { total, sent, opened, failed, pending, openRate };
  };

  const stats = getTrackingStats();

  // Auto-refresh function to check for tracking updates
  const refreshTrackingData = async () => {
    if (!batchId || refreshing) return;
    
    setRefreshing(true);
    try {
      await contextRefresh();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh tracking data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(refreshTrackingData, 10000);
    return () => clearInterval(interval);
  }, [batchId, refreshing]);

  // Test function to simulate email opens for testing
  const simulateEmailOpen = async (trackingId: string) => {
    try {
      await fetch(`/api/track/${trackingId}`);
      await refreshTrackingData();
    } catch (error) {
      console.error('Failed to simulate email open:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Email Tracking Dashboard</h2>
          <p className="text-sm text-gray-500">
            Real-time tracking of email delivery and opens
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshTrackingData}
          disabled={refreshing}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MailIcon className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-semibold text-gray-900">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-2xl font-semibold text-blue-600">{stats.sent}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MailOpenIcon className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-semibold text-green-600">{stats.opened}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-semibold text-red-600">{stats.failed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-2xl font-semibold text-purple-600">
                {stats.openRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Email Tracking Details
            <Badge variant="secondary" className="text-xs">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking Info
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recipients.map((recipient, index) => {
                  const data = typeof recipient.data === 'string' 
                    ? JSON.parse(recipient.data) 
                    : recipient.data;
                  
                  return (
                    <tr key={`${recipient.email}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {data.Name || data.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {recipient.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <StatusBox status={recipient.status} openedAt={recipient.openedAt} />
                          <Badge 
                            variant={
                              recipient.status === 'sent' && recipient.openedAt ? 'default' :
                              recipient.status === 'sent' ? 'secondary' :
                              recipient.status === 'failed' ? 'destructive' : 'outline'
                            }
                            className="text-xs"
                          >
                            {recipient.status === 'sent' && recipient.openedAt ? 'opened' : recipient.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipient.openedAt ? (
                          <div className="flex flex-col">
                            <span className="text-green-600 font-medium">✓ Email Opened</span>
                            <span className="text-xs text-gray-400">
                              {new Date(recipient.openedAt).toLocaleString()}
                            </span>
                          </div>
                        ) : recipient.status === 'sent' ? (
                          <div className="flex items-center text-blue-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Waiting for open</span>
                          </div>
                        ) : recipient.status === 'failed' ? (
                          <span className="text-red-600">Delivery failed</span>
                        ) : (
                          <span className="text-yellow-600">Not sent yet</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {recipient.trackingId && recipient.status === 'sent' && !recipient.openedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => simulateEmailOpen(recipient.trackingId!)}
                              className="text-xs px-2 py-1"
                            >
                              Test Open
                            </Button>
                          )}
                          {recipient.trackingId && (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              ID: {recipient.trackingId.slice(0, 8)}...
                            </code>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Email Tracking Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Each email contains an invisible 1x1 pixel image unique to the recipient</p>
          <p>• When the recipient opens the email, the pixel loads and registers as "opened"</p>
          <p>• Tracking works best with HTML emails and may not work if images are blocked</p>
          <p>• The dashboard refreshes automatically every 10 seconds to show new opens</p>
        </CardContent>
      </Card>
    </div>
  );
}