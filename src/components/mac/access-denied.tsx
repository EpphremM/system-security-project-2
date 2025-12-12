"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Mail } from "lucide-react";
import { SecurityLevel } from "@/generated/prisma/enums";
import { ClearanceBadge } from "./clearance-badge";

interface AccessDeniedProps {
  requiredLevel: SecurityLevel;
  userLevel: SecurityLevel;
  resourceName?: string;
  resourceType?: string;
  onContactAdmin?: () => void;
}

const securityLevelOrder: Record<SecurityLevel, number> = {
  PUBLIC: 1,
  INTERNAL: 2,
  CONFIDENTIAL: 3,
  RESTRICTED: 4,
  TOP_SECRET: 5,
};

export function AccessDenied({
  requiredLevel,
  userLevel,
  resourceName,
  resourceType = "resource",
  onContactAdmin,
}: AccessDeniedProps) {
  useEffect(() => {
    // Log the access attempt
    fetch("/api/audit/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "ACCESS_DENIED",
        resource: resourceName || resourceType,
        details: {
          requiredLevel,
          userLevel,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch((err) => {
      console.error("Failed to log access denial:", err);
    });
  }, [requiredLevel, userLevel, resourceName, resourceType]);

  const canUpgrade = securityLevelOrder[userLevel] < securityLevelOrder[requiredLevel];

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have the required clearance level
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Required Clearance:
              </p>
              <ClearanceBadge clearance={requiredLevel} showDetails size="lg" />
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Your Clearance:
              </p>
              <ClearanceBadge clearance={userLevel} showDetails size="lg" />
            </div>

            {resourceName && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Resource:</span> {resourceName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {resourceType}
                </p>
              </div>
            )}
          </div>

          {canUpgrade && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Clearance Upgrade Available
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    You may be eligible for a clearance upgrade. Contact your administrator
                    to request access to {requiredLevel} level resources.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1"
            >
              Go Back
            </Button>
            {onContactAdmin && (
              <Button onClick={onContactAdmin} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Contact Admin
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            This access attempt has been logged for security purposes.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



