"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Monitor, MapPin, Clock } from "lucide-react";

interface SessionsData {
  total: number;
  byUser: Array<{
    userId: string;
    email: string;
    count: number;
    lastActivity: string;
  }>;
  byDevice: Array<{
    deviceType: string;
    count: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
  }>;
  recentActivity: Array<{
    userId: string;
    email?: string;
    deviceType?: string;
    location?: string;
    lastActivity: string;
  }>;
}

export function SessionsMonitor() {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/security-overview?view=sessions");
        if (response.ok) {
          const result = await response.json();
          // Ensure all required arrays exist
          setData({
            total: result.total || 0,
            byUser: result.byUser || [],
            byDevice: result.byDevice || [],
            byLocation: result.byLocation || [],
            recentActivity: result.recentActivity || [],
          });
        } else {
          // Set empty data on error
          setData({
            total: 0,
            byUser: [],
            byDevice: [],
            byLocation: [],
            recentActivity: [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch sessions data:", err);
        // Set empty data on error
        setData({
          total: 0,
          byUser: [],
          byDevice: [],
          byLocation: [],
          recentActivity: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Loading...</CardContent></Card>;
  }

  if (!data) {
    return <Card><CardContent className="pt-6">No data available</CardContent></Card>;
  }

  // Ensure arrays exist before using slice
  const byDevice = data.byDevice || [];
  const byLocation = data.byLocation || [];
  const byUser = data.byUser || [];
  const recentActivity = data.recentActivity || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Active Sessions Overview
          </CardTitle>
          <CardDescription>Total: {data.total} active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">By Device</span>
              </div>
              <div className="space-y-1">
                {byDevice.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.deviceType}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">By Location</span>
              </div>
              <div className="space-y-1">
                {byLocation.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.location}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Top Users</span>
              </div>
              <div className="space-y-1">
                {byUser.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{item.email}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Recent Activity
          </CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 10).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{activity.email || activity.userId}</span>
                    {activity.deviceType && (
                      <span className="text-gray-500 text-xs">({activity.deviceType})</span>
                    )}
                    {activity.location && (
                      <span className="text-gray-500 text-xs">📍 {activity.location}</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(activity.lastActivity).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

