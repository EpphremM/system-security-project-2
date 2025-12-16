import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Clock, FileCheck, Lock, BarChart3 } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Secure Visitor Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Streamline visitor registration, enhance security, and maintain comprehensive audit trails
            with our enterprise-grade visitor management platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
        </div>

        
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            System Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Multi-Factor Authentication</CardTitle>
                <CardDescription>
                  Secure access with TOTP, WebAuthn, and Email OTP support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Visitor Management</CardTitle>
                <CardDescription>
                  Pre-registration, approval workflows, and QR code check-in
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Real-time Monitoring</CardTitle>
                <CardDescription>
                  Track active sessions, failed logins, and security threats
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileCheck className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle>Comprehensive Logging</CardTitle>
                <CardDescription>
                  Complete audit trails with encryption and integrity verification
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="h-8 w-8 text-red-600 mb-2" />
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  MAC, DAC, RBAC, RuBAC, and ABAC for fine-grained permissions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-indigo-600 mb-2" />
                <CardTitle>Reporting & Analytics</CardTitle>
                <CardDescription>
                  Generate compliance reports, security assessments, and operational insights
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
