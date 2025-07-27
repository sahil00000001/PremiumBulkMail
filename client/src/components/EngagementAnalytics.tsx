import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Eye, TrendingUp, Users, Filter, ArrowUpDown } from "lucide-react";
import { useEmail } from "@/hooks/use-email";

interface EngagementData {
  email: string;
  name: string;
  openedAt: string | null;
  lastSeenAt: string | null;
  viewCount: number;
  totalViewTime: number;
  engagementLevel: 'high' | 'medium' | 'low' | 'none';
  engagementLabel: string;
  engagementColor: string;
}

export function EngagementAnalytics() {
  const { recipients } = useEmail();
  const [sortBy, setSortBy] = useState<'viewTime' | 'viewCount' | 'name' | 'openedAt'>('viewTime');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      const data = typeof recipient.data === 'string' 
        ? JSON.parse(recipient.data) 
        : recipient.data;
      
      const engagement = getEngagementLevel(recipient.totalViewTime || 0);
      
      return {
        email: recipient.email,
        name: data.Name || data.name || 'N/A',
        openedAt: recipient.openedAt,
        lastSeenAt: recipient.lastSeenAt,
        viewCount: recipient.viewCount || 0,
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
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
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
    
    const totalViewCount = engagementData.reduce((sum, item) => sum + item.viewCount, 0);
    const averageViewCount = opened > 0 ? totalViewCount / opened : 0;

    return {
      total,
      opened,
      highEngagement,
      mediumEngagement,
      lowEngagement,
      averageViewTime,
      averageViewCount,
      openRate: total > 0 ? (opened / total) * 100 : 0
    };
  }, [engagementData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Engagement Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400">Track recipient engagement and reading time to identify interested leads</p>
      </div>

      {/* Engagement Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              High Interest Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{engagementStats.highEngagement}</span>
              <Badge className="bg-green-100 text-green-700">30s+ reading</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg. Reading Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">
                {formatEngagementTime(engagementStats.averageViewTime)}
              </span>
              <Badge variant="secondary">per open</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Avg. View Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600">
                {engagementStats.averageViewCount.toFixed(1)}
              </span>
              <Badge variant="secondary">per recipient</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-indigo-600">
                {engagementStats.openRate.toFixed(1)}%
              </span>
              <Badge variant="outline">{engagementStats.opened}/{engagementStats.total}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
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
                <SelectItem value="viewCount">View Count</SelectItem>
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

        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedData.length} of {engagementData.length} recipients
        </div>
      </div>

      {/* Engagement Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Engagement Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reading Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedData.map((item, index) => (
                  <tr key={`${item.email}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={item.engagementColor}>
                        {item.engagementLabel}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono font-semibold">
                          {formatEngagementTime(item.totalViewTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{item.viewCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.lastSeenAt ? (
                        <div>
                          {new Date(item.lastSeenAt).toLocaleDateString()}
                          <br />
                          <span className="text-xs">{new Date(item.lastSeenAt).toLocaleTimeString()}</span>
                        </div>
                      ) : (
                        '-'
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