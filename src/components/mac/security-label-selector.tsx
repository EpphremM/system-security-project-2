"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SecurityLevel } from "@/generated/prisma/enums";

interface SecurityLabelSelectorProps {
  value: SecurityLevel;
  onChange: (value: SecurityLevel) => void;
  disabled?: boolean;
  showWarning?: boolean;
  requireApproval?: boolean;
}

const securityLevelConfig: Record<SecurityLevel, { label: string; color: string; description: string }> = {
  PUBLIC: {
    label: "Public",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Information that can be publicly disclosed",
  },
  INTERNAL: {
    label: "Internal",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Information for internal use only",
  },
  CONFIDENTIAL: {
    label: "Confidential",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Sensitive information requiring protection",
  },
  RESTRICTED: {
    label: "Restricted",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Highly sensitive information with strict access controls",
  },
  TOP_SECRET: {
    label: "Top Secret",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Highest level of classification",
  },
};

export function SecurityLabelSelector({
  value,
  onChange,
  disabled = false,
  showWarning = true,
  requireApproval = false,
}: SecurityLabelSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<SecurityLevel>(value);
  const isHighSecurity = selectedValue === "CONFIDENTIAL" || selectedValue === "RESTRICTED" || selectedValue === "TOP_SECRET";

  const handleChange = (newValue: SecurityLevel) => {
    setSelectedValue(newValue);
    onChange(newValue);
  };

  const config = securityLevelConfig[selectedValue];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="security-label">Security Classification</Label>
        <Select
          value={selectedValue}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger id="security-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(securityLevelConfig).map(([level, config]) => (
              <SelectItem key={level} value={level}>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{config.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.color}`}>
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>

      <p className="text-xs text-muted-foreground">{config.description}</p>

      {/* Warning for High Security */}
      {showWarning && isHighSecurity && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">
                  High Security Classification Selected
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  {requireApproval
                    ? "This classification requires admin approval before it can be applied."
                    : "This information requires special handling and access controls."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



