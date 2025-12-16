"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeviceComplianceProps {
  resourceId?: string;
  resourceType?: string;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isSecure: boolean;
  hasRequiredFeatures: boolean;
  complianceStatus: "COMPLIANT" | "NON_COMPLIANT" | "WARNING";
  issues: string[];
}

export function DeviceCompliance({ resourceId, resourceType }: DeviceComplianceProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDeviceCompliance();
  }, []);

  const checkDeviceCompliance = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/rubac/device-compliance");
      if (response.ok) {
        const data = await response.json();
        setDeviceInfo(data);
      }
    } catch (error) {
      console.error("Device compliance check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "NON_COMPLIANT":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLIANT":
        return "bg-green-100 text-green-800";
      case "NON_COMPLIANT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking device...</p>
        </CardContent>
      </Card>
    );
  }

  if (!deviceInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to check device compliance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Device Compliance Check</CardTitle>
        </div>
        <CardDescription>
          Verify your device meets security requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(deviceInfo.complianceStatus)}
            <div>
              <p className="font-medium">Compliance Status</p>
              <p className="text-sm text-muted-foreground">
                {deviceInfo.complianceStatus === "COMPLIANT"
                  ? "Your device meets all requirements"
                  : "Your device has compliance issues"}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(deviceInfo.complianceStatus)}>
            {deviceInfo.complianceStatus}
          </Badge>
        </div>

        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Device Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform:</span>
              <span>{deviceInfo.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile Device:</span>
              <span>{deviceInfo.isMobile ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Secure Connection:</span>
              <span>{deviceInfo.isSecure ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Features:</span>
              <span>{deviceInfo.hasRequiredFeatures ? "Available" : "Missing"}</span>
            </div>
          </div>
        </div>

        
        {deviceInfo.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Compliance Issues</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {deviceInfo.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={checkDeviceCompliance} variant="outline" className="w-full">
          Re-check Compliance
        </Button>
      </CardContent>
    </Card>
  );
}


