import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, Users, Filter, ArrowUpDown, Download, RefreshCw } from "lucide-react";
import { useEmail } from "@/hooks/use-email";
import * as XLSX from 'xlsx';

interface EngagementData {
  email: string;
  name: string;
  openedAt: string | null;
  lastSeenAt: string | null;
  totalViewTime: number;
  engagementLevel: 'high' | 'medium' | 'low' | 'none';
  engagementLabel: string;
  engagementColor: string;
}

export function EngagementAnalytics() {
  const { recipients, refreshTrackingData } = useEmail();
  const [sortBy, setSortBy] = useState<'viewTime' | 'name' | 'openedAt'>('viewTime');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (refreshTrackingData) {
        await refreshTrackingData();
        setLastUpdated(new Date());
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshTrackingData]);

  // Manual refresh function
  const handleRefresh = async () => {
    if (refreshTrackingData) {
      setIsRefreshing(true);
      try {
        await refreshTrackingData();
        setLastUpdated(new Date());
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Format engagement time
  const formatEngagementTime = (milliseconds: number): string => {
    if (!milliseconds || milliseconds < 0) return '0:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get engagement level
  const getEngagementLevel = (totalViewTime: number) => {
    if (totalViewTime === 0) {
      return { level: 'none' as const, label: 'Not Opened', color: 'bg-gray-100 text-gray-600' };
    } else if (totalViewTime >= 30000) { // 30+ seconds
      return { level: 'high' as const, label: 'High Interest', color: 'bg-green-100 text-green-700' };
    } else if (totalViewTime >= 10000) { // 10-29 seconds
      return { level: 'medium' as const, label: 'Medium Interest', color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { level: 'low' as const, label: 'Quick Glance', color: 'bg-orange-100 text-orange-700' };
    }
  };

  // Process engagement data
  const engagementData: EngagementData[] = useMemo(() => {
    return recipients.map(recipient => {
      let data;
      try {
        data = typeof recipient.data === 'string' 
          ? JSON.parse(recipient.data) 
          : recipient.data;
      } catch {
        data = {};
      }
      
      const engagement = getEngagementLevel(recipient.totalViewTime || 0);
      
      return {
        email: recipient.email,
        name: data.Name || data.name || 'N/A',
        openedAt: recipient.openedAt || null,
        lastSeenAt: recipient.lastSeenAt || null,
        totalViewTime: recipient.totalViewTime || 0,
        engagementLevel: engagement.level,
        engagementLabel: engagement.label,
        engagementColor: engagement.color
      };
    });
  }, [recipients]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = engagementData;

    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(item => item.engagementLevel === filterBy);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'viewTime':
          comparison = a.totalViewTime - b.totalViewTime;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'openedAt':
          const aDate = a.openedAt ? new Date(a.openedAt).getTime() : 0;
          const bDate = b.openedAt ? new Date(b.openedAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [engagementData, sortBy, filterBy, sortOrder]);

  // Calculate engagement statistics
  const engagementStats = useMemo(() => {
    const total = engagementData.length;
    const opened = engagementData.filter(item => item.openedAt).length;
    const highEngagement = engagementData.filter(item => item.engagementLevel === 'high').length;
    const mediumEngagement = engagementData.filter(item => item.engagementLevel === 'medium').length;
    const lowEngagement = engagementData.filter(item => item.engagementLevel === 'low').length;
    
    const totalViewTime = engagementData.reduce((sum, item) => sum + item.totalViewTime, 0);
    const averageViewTime = opened > 0 ? totalViewTime / opened : 0;

    return {
      total,
      opened,
      highEngagement,
      mediumEngagement,
      lowEngagement,
      averageViewTime,
      openRate: total > 0 ? (opened / total) * 100 : 0
    };
  }, [engagementData]);

  // Export to Excel function
  const exportToExcel = () => {
    const exportData = filteredAndSortedData.map(item => ({
      'Recipient Name': item.name,
      'Email Address': item.email,
      'Engagement Level': item.engagementLabel,
      'Reading Time': formatEngagementTime(item.totalViewTime),
      'Opened At': item.openedAt ? new Date(item.openedAt).toLocaleString() : 'Not Opened',
      'Last Seen': item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : 'N/A',
      'Total View Time (seconds)': Math.floor(item.totalViewTime / 1000)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Engagement Analysis");
    XLSX.writeFile(wb, `email-engagement-analysis-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper function for engagement badge classes
  const getEngagementBadgeClass = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
      case 'medium':
        return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
      case 'low':
        return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20';
      default:
        return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/30';
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">Email Engagement Analytics</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Track recipient engagement and reading time to identify interested leads</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportToExcel}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Engagement Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              High Interest Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-3xl md:text-4xl font-semibold text-indigo-600" data-testid="text-high-engagement">{engagementStats.highEngagement}</span>
              <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">30s+</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Avg. Reading Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-3xl md:text-4xl font-semibold text-indigo-600" data-testid="text-avg-reading-time">
                {formatEngagementTime(engagementStats.averageViewTime)}
              </span>
              <Badge className="bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/30">per open</Badge>
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-3xl md:text-4xl font-semibold text-indigo-600" data-testid="text-open-rate">
                {engagementStats.openRate.toFixed(1)}%
              </span>
              <Badge className="bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/30">{engagementStats.opened}/{engagementStats.total}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 bg-white/60 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filter:</span>
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipients</SelectItem>
                <SelectItem value="high">High Interest</SelectItem>
                <SelectItem value="medium">Medium Interest</SelectItem>
                <SelectItem value="low">Quick Glance</SelectItem>
                <SelectItem value="none">Not Opened</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewTime">Reading Time</SelectItem>
                <SelectItem value="openedAt">Open Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </Button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAndSortedData.length} of {engagementData.length} recipients
        </div>
      </div>

      {/* Engagement Table */}
      <Card className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Engagement Analysis</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Individual recipient engagement metrics and behavior</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Engagement Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reading Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedData.map((item, index) => (
                  <tr 
                    key={`${item.email}-${index}`} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}
                    data-testid={`row-recipient-${index}`}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`text-name-${index}`}>{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-email-${index}`}>{item.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <Badge className={getEngagementBadgeClass(item.engagementLevel)} data-testid={`badge-engagement-${index}`}>
                        {item.engagementLabel}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-200" data-testid={`text-reading-time-${index}`}>
                          {formatEngagementTime(item.totalViewTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.lastSeenAt ? (
                        <div className="space-y-1" data-testid={`text-last-seen-${index}`}>
                          <div className="font-medium">{new Date(item.lastSeenAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(item.lastSeenAt).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}