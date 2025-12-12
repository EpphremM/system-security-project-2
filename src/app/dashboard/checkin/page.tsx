"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Camera, User, Printer } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string;
  purpose: string;
  qrCode: string | null;
  status: string;
}

export default function CheckInPage() {
  const [manualEntry, setManualEntry] = useState("");
  const [currentVisitor, setCurrentVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleManualCheckIn = async () => {
    if (!manualEntry.trim()) {
      setError("Please enter a QR code or visitor ID");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/visitors/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qrCode: manualEntry,
          visitorId: manualEntry,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Check-in failed");
        setLoading(false);
        return;
      }

      setCurrentVisitor(result.visitor);
      setManualEntry("");
    } catch (err) {
      console.error("Check-in error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handlePrintBadge = () => {
    if (currentVisitor) {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Check-in Kiosk</h1>
        <p className="mt-2 text-sm text-gray-600">
          Scan QR code or manually enter visitor information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Camera/Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan visitor QR code for quick check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraActive ? (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Camera not active
                  </p>
                  <Button onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-white border-dashed rounded-lg m-8 pointer-events-none" />
                </div>
                <Button onClick={stopCamera} variant="outline" className="w-full">
                  Stop Camera
                </Button>
              </div>
            )}

            {/* Manual Entry */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Or enter manually</label>
              <div className="flex gap-2">
                <Input
                  placeholder="QR code or Visitor ID"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleManualCheckIn();
                    }
                  }}
                />
                <Button
                  onClick={handleManualCheckIn}
                  disabled={loading || !manualEntry.trim()}
                >
                  {loading ? <LoadingSpinner size="sm" /> : "Check In"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Visitor Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Visitor
            </CardTitle>
            <CardDescription>
              Visitor information and badge printing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentVisitor ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">
                      {currentVisitor.firstName} {currentVisitor.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-semibold">{currentVisitor.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-semibold">{currentVisitor.purpose}</p>
                  </div>
                  {currentVisitor.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{currentVisitor.email}</p>
                    </div>
                  )}
                </div>

                {currentVisitor.qrCode && (
                  <div className="p-4 bg-white rounded-lg border flex items-center justify-center">
                    <QrCode className="h-32 w-32" />
                  </div>
                )}

                <Button onClick={handlePrintBadge} className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Badge
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No visitor checked in"
                description="Scan a QR code or enter visitor information to check in"
                icon={<User className="h-12 w-12 text-gray-400" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



