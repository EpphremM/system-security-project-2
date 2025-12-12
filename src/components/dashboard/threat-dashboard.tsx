"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, TrendingUp } from "lucide-react";

interface ThreatData {
  activeThreats: Array<{
    id: string;
    threatType: string;
    severity: string;
    source: string;
    description: string;
    detectedAt: string;
  }>;
  threatMap: Array<{
    ip: string;
    country?: string;
    severity: string;
    count: number;
  }>;
  threatTrends: Array<{
    date: string;
    count: number;
  }>;
}

export function ThreatDashboard() {
  const [data, setData] = useState<ThreatData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/security-overview?view=threats");
        if (response.ok) {
          const result = await response.json();
          // Ensure all required arrays exist
          setData({
            activeThreats: result.activeThreats || [],
            threatMap: result.threatMap || [],
            threatTrends: result.threatTrends || [],
          });
        } else {
          // Set empty data on error
          setData({
            activeThreats: [],
            threatMap: [],
            threatTrends: [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch threat data:", err);
        // Set empty data on error
        setData({
          activeThreats: [],
          threatMap: [],
          threatTrends: [],
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
  const activeThreats = data.activeThreats || [];
  const threatMap = data.threatMap || [];
  const threatTrends = data.threatTrends || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Threats
            </CardTitle>
            <CardDescription>Currently monitored threats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeThreats.slice(0, 5).map((threat) => (
                <div
                  key={threat.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(threat.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{threat.threatType}</p>
                      <p className="text-xs mt-1 opacity-80">{threat.description}</p>
                      {threat.source && (
                        <p className="text-xs mt-1 font-mono">{threat.source}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold">{threat.severity}</span>
                  </div>
                  <p className="text-xs mt-2 opacity-70">
                    Detected: {new Date(threat.detectedAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {activeThreats.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active threats</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Threat Trends
            </CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {threatTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{trend.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((trend.count / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{trend.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {threatMap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Threat Map
            </CardTitle>
            <CardDescription>Geographic distribution of threats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {threatMap.slice(0, 10).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{item.ip}</span>
                    {item.country && (
                      <span className="text-xs text-gray-500">({item.country})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

