"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface Backup {
  id: string;
  backupType: string;
  backupName: string;
  status: string;
  size?: number;
  createdAt: string;
  completedAt?: string;
  verified: boolean;
  restorationTested: boolean;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [nextBackup, setNextBackup] = useState<Date | null>(null);

  useEffect(() => {
    fetchBackups();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBackups, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      // This would fetch from a backup status API
      // For now, we'll use a placeholder
      const response = await fetch("/api/backup/status");
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
        if (data.lastBackup) setLastBackup(new Date(data.lastBackup));
        if (data.nextBackup) setNextBackup(new Date(data.nextBackup));
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
      // Set empty array on error
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setBackingUp(true);
    try {
      const response = await fetch("/api/backup/perform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backupType: "FULL",
        }),
      });

      if (response.ok) {
        // Refresh backup list
        setTimeout(() => {
          fetchBackups();
          setBackingUp(false);
        }, 2000);
      } else {
        setBackingUp(false);
      }
    } catch (error) {
      console.error("Backup failed:", error);
      setBackingUp(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "IN_PROGRESS":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor backup status and perform manual backups
          </p>
        </div>
        <Button onClick={handleManualBackup} disabled={backingUp}>
          {backingUp ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Backing up...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Manual Backup
            </>
          )}
        </Button>
      </div>

      {/* Backup Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-2xl font-bold">
                  {lastBackup ? lastBackup.toLocaleDateString() : "Never"}
                </p>
                {lastBackup && (
                  <p className="text-xs text-muted-foreground">
                    {lastBackup.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Scheduled Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-2xl font-bold">
                  {nextBackup ? nextBackup.toLocaleDateString() : "Not scheduled"}
                </p>
                {nextBackup && (
                  <p className="text-xs text-muted-foreground">
                    {nextBackup.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-400" />
              <p className="text-2xl font-bold">{backups.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>
            Recent backup operations and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : backups.length === 0 ? (
            <EmptyState
              title="No backups found"
              description="No backup operations have been performed yet"
              icon={<Database className="h-12 w-12 text-gray-400" />}
              action={{
                label: "Create Backup",
                onClick: handleManualBackup,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Type</th>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Size</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                    <th className="text-left p-4 font-semibold">Verified</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-sm font-medium">{backup.backupType}</td>
                      <td className="p-4 text-sm">{backup.backupName}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(backup.status)}
                          <span className="text-sm">{backup.status}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{formatBytes(backup.size)}</td>
                      <td className="p-4 text-sm">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {backup.verified ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



