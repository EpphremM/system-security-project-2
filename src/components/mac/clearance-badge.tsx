"use client";

import { Shield, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SecurityLevel } from "@/generated/prisma/enums";

interface ClearanceBadgeProps {
  clearance: SecurityLevel;
  categories?: string[];
  compartments?: string[];
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

const clearanceConfig: Record<SecurityLevel, { label: string; color: string; description: string }> = {
  PUBLIC: {
    label: "Public",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Access to public information only",
  },
  INTERNAL: {
    label: "Internal",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Access to internal information",
  },
  CONFIDENTIAL: {
    label: "Confidential",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Access to confidential information",
  },
  RESTRICTED: {
    label: "Restricted",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Access to restricted information",
  },
  TOP_SECRET: {
    label: "Top Secret",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Access to top secret information",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function ClearanceBadge({
  clearance,
  categories = [],
  compartments = [],
  showDetails = false,
  size = "md",
}: ClearanceBadgeProps) {
  const config = clearanceConfig[clearance];

  const badge = (
    <div className={`inline-flex items-center gap-1.5 rounded-md border ${config.color} ${sizeClasses[size]}`}>
      <Shield className="h-3.5 w-3.5" />
      <span className="font-medium">{config.label}</span>
    </div>
  );

  const tooltipContent = (
    <div className="space-y-2">
      <div>
        <p className="font-semibold">{config.label} Clearance</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-medium">Categories:</p>
          <p className="text-xs text-muted-foreground">{categories.join(", ")}</p>
        </div>
      )}
      {compartments.length > 0 && (
        <div>
          <p className="text-xs font-medium">Compartments:</p>
          <p className="text-xs text-muted-foreground">{compartments.join(", ")}</p>
        </div>
      )}
    </div>
  );

  if (showDetails) {
    return (
      <div className="space-y-2">
        {badge}
        {(categories.length > 0 || compartments.length > 0) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {categories.length > 0 && (
              <div>
                <span className="font-medium">Categories: </span>
                {categories.join(", ")}
              </div>
            )}
            {compartments.length > 0 && (
              <div>
                <span className="font-medium">Compartments: </span>
                {compartments.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



