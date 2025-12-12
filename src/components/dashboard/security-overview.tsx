"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Users, Activity, TrendingUp, AlertCircle } from "lucide-react";

interface SecurityOverviewData {
  threats: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  sessions: {
    active: number;
    recent: number;
  };
  failedLogins: {
    last24h: number;
    last7d: number;
    topIPs: Array<{ ip: string; count: number }>;
  };
  systemHealth: {
    status: string;
    metrics: {
      cpu?: number;
      memory?: number;
      disk?: number;
      networkLatency?: number;
    };
    services: {
      database: string;
      api: string;
      backup: string;
    };
  };
}

export function SecurityOverview() {
  const [data, setData] = useState<SecurityOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/security-overview");
        if (!response.ok) {
          throw new Error("Failed to fetch security overview");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error || "No data available"}</p>
        </CardContent>
      </Card>
    );
  }

  // Ensure arrays exist before using slice
  const topIPs = data.failedLogins?.topIPs || [];

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "text-green-600";
      case "WARNING":
        return "text-yellow-600";
      case "CRITICAL":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.threats.active}</div>
            <p className="text-xs text-muted-foreground">
              {data.threats.critical} critical, {data.threats.high} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.sessions.active}</div>
            <p className="text-xs text-muted-foreground">
              {data.sessions.recent} new in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Shield className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.failedLogins.last24h}</div>
            <p className="text-xs text-muted-foreground">
              {data.failedLogins.last7d} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className={`h-4 w-4 ${getHealthStatusColor(data.systemHealth.status)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthStatusColor(data.systemHealth.status)}`}>
              {data.systemHealth.status}
            </div>
            <p className="text-xs text-muted-foreground">
              CPU: {data.systemHealth.metrics.cpu?.toFixed(1) || "N/A"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Threat Breakdown</CardTitle>
            <CardDescription>Current threat levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600 font-medium">Critical</span>
                <span className="text-sm font-bold">{data.threats.critical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-600 font-medium">High</span>
                <span className="text-sm font-bold">{data.threats.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-600 font-medium">Medium</span>
                <span className="text-sm font-bold">{data.threats.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600 font-medium">Low</span>
                <span className="text-sm font-bold">{data.threats.low}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
            <CardDescription>Resource usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU</span>
                  <span>{data.systemHealth.metrics.cpu?.toFixed(1) || "N/A"}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(data.systemHealth.metrics.cpu || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory</span>
                  <span>{data.systemHealth.metrics.memory?.toFixed(1) || "N/A"}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(data.systemHealth.metrics.memory || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Disk</span>
                  <span>{data.systemHealth.metrics.disk?.toFixed(1) || "N/A"}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(data.systemHealth.metrics.disk || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top IPs with Failed Logins */}
      {topIPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top IPs with Failed Logins</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topIPs.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-mono">{item.ip}</span>
                  <span className="text-sm font-bold text-red-600">{item.count} attempts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

