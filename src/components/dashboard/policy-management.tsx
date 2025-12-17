"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";

interface PolicyData {
  total: number;
  byType: Array<{ type: string; count: number }>;
  enabled: number;
  disabled: number;
  recentChanges: Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    updatedAt: string;
    updatedBy?: string;
  }>;
}

export function PolicyManagement() {
  const [data, setData] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/policies");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch policy data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Loading...</CardContent></Card>;
  }

  if (!data) {
    return <Card><CardContent className="pt-6">No data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.enabled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.disabled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Rate</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.total > 0 ? Math.round((data.enabled / data.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      
      <Card>
        <CardHeader>
          <CardTitle>Policies by Type</CardTitle>
          <CardDescription>Distribution of policies across types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.byType.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.count / data.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Recent Policy Changes</CardTitle>
          <CardDescription>Latest policy updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentChanges.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{policy.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      policy.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {policy.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="text-xs text-gray-500">{policy.type}</span>
                  </div>
                  {policy.updatedBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      Updated by {policy.updatedBy}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(policy.updatedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



