"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeRule {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  enabled: boolean;
}

interface TimeRuleEditorProps {
  resourceId?: string;
  resourceType?: string;
  onSave?: (rules: TimeRule[]) => void;
}

export function TimeRuleEditor({
  resourceId,
  resourceType,
  onSave,
}: TimeRuleEditorProps) {
  const [rules, setRules] = useState<TimeRule[]>([]);
  const [newRule, setNewRule] = useState<Partial<TimeRule>>({
    days: [],
    startTime: "09:00",
    endTime: "17:00",
    timezone: "UTC",
    enabled: true,
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const toggleDay = (day: string) => {
    const currentDays = newRule.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    setNewRule({ ...newRule, days: newDays });
  };

  const addRule = () => {
    if (newRule.days && newRule.days.length > 0 && newRule.startTime && newRule.endTime) {
      const rule: TimeRule = {
        id: `rule-${Date.now()}`,
        days: newRule.days,
        startTime: newRule.startTime,
        endTime: newRule.endTime,
        timezone: newRule.timezone || "UTC",
        enabled: newRule.enabled !== false,
      };
      setRules([...rules, rule]);
      setNewRule({
        days: [],
        startTime: "09:00",
        endTime: "17:00",
        timezone: "UTC",
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
        const response = await fetch("/api/rubac/time-rules", {
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
        console.error("Failed to save time rules:", error);
      }
    } else {
      onSave?.(rules);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Time-Based Access Rules</CardTitle>
        </div>
        <CardDescription>
          Restrict access to specific days and times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newRule.startTime}
                onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={newRule.endTime}
                onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={newRule.days?.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <span className="text-sm">{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={newRule.timezone}
              onValueChange={(value) => setNewRule({ ...newRule, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
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
                    <Checkbox
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRuleEnabled(rule.id)}
                    />
                    <span className="font-medium">
                      {rule.startTime} - {rule.endTime}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({rule.days.join(", ")})
                    </span>
                    {!rule.enabled && (
                      <span className="text-xs text-muted-foreground">(Disabled)</span>
                    )}
                  </div>
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

        {rules.length > 0 && (
          <Button onClick={handleSave} className="w-full">
            Save Rules
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


