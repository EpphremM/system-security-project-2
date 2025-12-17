"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";

interface LocationRule {
  id: string;
  name: string;
  type: "IP_RANGE" | "GEO_LOCATION" | "NETWORK";
  value: string;
  enabled: boolean;
}

interface LocationRuleSetupProps {
  resourceId?: string;
  resourceType?: string;
  onSave?: (rules: LocationRule[]) => void;
}

export function LocationRuleSetup({
  resourceId,
  resourceType,
  onSave,
}: LocationRuleSetupProps) {
  const [rules, setRules] = useState<LocationRule[]>([]);
  const [newRule, setNewRule] = useState<Partial<LocationRule>>({
    name: "",
    type: "IP_RANGE",
    value: "",
    enabled: true,
  });

  const addRule = () => {
    if (newRule.name && newRule.value) {
      const rule: LocationRule = {
        id: `rule-${Date.now()}`,
        name: newRule.name,
        type: newRule.type || "IP_RANGE",
        value: newRule.value,
        enabled: newRule.enabled !== false,
      };
      setRules([...rules, rule]);
      setNewRule({
        name: "",
        type: "IP_RANGE",
        value: "",
        enabled: true,
      });
    }
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const toggleRuleEnabled = (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleSave = async () => {
    if (resourceId && resourceType) {
      try {
        const response = await fetch("/api/rubac/location-rules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId,
            resourceType,
            rules,
          }),
        });

        if (response.ok) {
          onSave?.(rules);
        }
      } catch (error) {
        console.error("Failed to save location rules:", error);
      }
    } else {
      onSave?.(rules);
    }
  };

  const getPlaceholder = (type: string) => {
    switch (type) {
      case "IP_RANGE":
        return "192.168.1.0/24 or 192.168.1.1-192.168.1.255";
      case "GEO_LOCATION":
        return "Country code (e.g., US, GB, ET)";
      case "NETWORK":
        return "Network name or SSID";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <CardTitle>Location-Based Access Rules</CardTitle>
        </div>
        <CardDescription>
          Restrict access based on IP address, geographic location, or network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              placeholder="e.g., Office Network"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location Type</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={newRule.type}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  type: e.target.value as LocationRule["type"],
                })
              }
            >
              <option value="IP_RANGE">IP Range</option>
              <option value="GEO_LOCATION">Geographic Location</option>
              <option value="NETWORK">Network/SSID</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              placeholder={getPlaceholder(newRule.type || "IP_RANGE")}
              value={newRule.value}
              onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {getPlaceholder(newRule.type || "IP_RANGE")}
            </p>
          </div>

          <Button onClick={addRule} className="w-full" disabled={!newRule.name || !newRule.value}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Location</p>
              <p className="text-xs text-muted-foreground">
                Checking your current access...
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch("/api/rubac/check-location");
                  const data = await response.json();
                  alert(`IP: ${data.ip}\nLocation: ${data.location || "Unknown"}`);
                } catch (error) {
                  console.error("Location check failed:", error);
                }
              }}
            >
              Check Now
            </Button>
          </div>
        </div>

        {}
        {rules.length > 0 && (
          <div className="space-y-2">
            <Label>Active Rules</Label>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {rule.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <span className="font-medium">{rule.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({rule.type}: {rule.value})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRuleEnabled(rule.id)}
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {rules.length > 0 && (
          <Button onClick={handleSave} className="w-full">
            Save Rules
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


