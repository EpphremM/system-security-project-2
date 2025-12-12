"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Plus, Trash2, Play } from "lucide-react";

interface PolicyRule {
  id: string;
  attribute: string;
  operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN";
  value: string;
}

interface Policy {
  id?: string;
  name: string;
  description: string;
  effect: "ALLOW" | "DENY";
  rules: PolicyRule[];
  enabled: boolean;
}

interface PolicyBuilderProps {
  resourceId?: string;
  resourceType?: string;
  onSave?: (policy: Policy) => void;
}

export function PolicyBuilder({
  resourceId,
  resourceType,
  onSave,
}: PolicyBuilderProps) {
  const [policy, setPolicy] = useState<Policy>({
    name: "",
    description: "",
    effect: "ALLOW",
    rules: [],
    enabled: true,
  });

  const [newRule, setNewRule] = useState<PolicyRule>({
    id: "",
    attribute: "department",
    operator: "EQUALS",
    value: "",
  });

  const attributes = [
    { value: "department", label: "Department" },
    { value: "role", label: "Role" },
    { value: "securityClearance", label: "Security Clearance" },
    { value: "location", label: "Location" },
    { value: "timeOfDay", label: "Time of Day" },
    { value: "deviceType", label: "Device Type" },
  ];

  const operators = [
    { value: "EQUALS", label: "Equals" },
    { value: "CONTAINS", label: "Contains" },
    { value: "GREATER_THAN", label: "Greater Than" },
    { value: "LESS_THAN", label: "Less Than" },
    { value: "IN", label: "In (comma-separated)" },
  ];

  const addRule = () => {
    if (newRule.attribute && newRule.value) {
      const rule: PolicyRule = {
        ...newRule,
        id: `rule-${Date.now()}`,
      };
      setPolicy({
        ...policy,
        rules: [...policy.rules, rule],
      });
      setNewRule({
        id: "",
        attribute: "department",
        operator: "EQUALS",
        value: "",
      });
    }
  };

  const removeRule = (id: string) => {
    setPolicy({
      ...policy,
      rules: policy.rules.filter((r) => r.id !== id),
    });
  };

  const handleSave = async () => {
    if (!policy.name || policy.rules.length === 0) {
      alert("Please provide a policy name and at least one rule");
      return;
    }

    if (resourceId && resourceType) {
      try {
        const response = await fetch("/api/abac/policies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId,
            resourceType,
            ...policy,
          }),
        });

        if (response.ok) {
          onSave?.(policy);
        }
      } catch (error) {
        console.error("Failed to save policy:", error);
      }
    } else {
      onSave?.(policy);
    }
  };

  const handleTest = async () => {
    try {
      const response = await fetch("/api/abac/policies/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          policy,
          testAttributes: {
            department: "HR",
            role: "Manager",
            securityClearance: "CONFIDENTIAL",
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Policy Test Result: ${result.allowed ? "ALLOWED" : "DENIED"}\nReason: ${result.reason || "N/A"}`);
      }
    } catch (error) {
      console.error("Policy test failed:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>ABAC Policy Builder</CardTitle>
        </div>
        <CardDescription>
          Create attribute-based access control policies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Policy Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Policy Name</Label>
            <Input
              placeholder="e.g., HR Manager Salary Access"
              value={policy.name}
              onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Describe what this policy does..."
              value={policy.description}
              onChange={(e) =>
                setPolicy({ ...policy, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Effect</Label>
            <Select
              value={policy.effect}
              onValueChange={(value) =>
                setPolicy({ ...policy, effect: value as "ALLOW" | "DENY" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALLOW">Allow Access</SelectItem>
                <SelectItem value="DENY">Deny Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rule Builder */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Add Rule</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Attribute</Label>
              <Select
                value={newRule.attribute}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, attribute: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {attributes.map((attr) => (
                    <SelectItem key={attr.value} value={attr.value}>
                      {attr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={newRule.operator}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, operator: value as PolicyRule["operator"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder="Enter value..."
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={addRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Existing Rules */}
        {policy.rules.length > 0 && (
          <div className="space-y-2">
            <Label>Policy Rules (All must match)</Label>
            {policy.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <span className="font-medium">{rule.attribute}</span>
                  <span className="mx-2 text-muted-foreground">
                    {rule.operator}
                  </span>
                  <span className="text-muted-foreground">"{rule.value}"</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleTest} variant="outline" className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Test Policy
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={!policy.name || policy.rules.length === 0}>
            Save Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


