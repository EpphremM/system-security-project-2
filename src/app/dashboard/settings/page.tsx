"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeRuleEditor } from "@/components/rubac/time-rule-editor";
import { LocationRuleSetup } from "@/components/rubac/location-rule-setup";
import { DeviceCompliance } from "@/components/rubac/device-compliance";
import { PolicyBuilder } from "@/components/abac/policy-builder";
import { User, Shield, Clock, MapPin, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account and security settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="rubac">
            <Clock className="h-4 w-4 mr-2" />
            RuBAC Rules
          </TabsTrigger>
          <TabsTrigger value="abac">
            <Shield className="h-4 w-4 mr-2" />
            ABAC Policies
          </TabsTrigger>
          <TabsTrigger value="device">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Device
          </TabsTrigger>
          <TabsTrigger value="location">
            <MapPin className="h-4 w-4 mr-2" />
            Location
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-gray-600">{session?.user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-gray-600">{session?.user?.name || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <p className="text-sm text-gray-600">{session?.user?.role || "USER"}</p>
                </div>
                {session?.user && "department" in session.user && session.user.department && (
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <p className="text-sm text-gray-600">{session.user.department}</p>
                  </div>
                )}
                {session?.user && "securityClearance" in session.user && session.user.securityClearance && (
                  <div>
                    <label className="text-sm font-medium">Security Clearance</label>
                    <p className="text-sm text-gray-600">{session.user.securityClearance}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rubac" className="space-y-4">
          <TimeRuleEditor />
        </TabsContent>

        <TabsContent value="abac" className="space-y-4">
          <PolicyBuilder />
        </TabsContent>

        <TabsContent value="device" className="space-y-4">
          <DeviceCompliance />
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <LocationRuleSetup />
        </TabsContent>
      </Tabs>
    </div>
  );
}
