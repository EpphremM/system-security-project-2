"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Building, MapPin, Plus, Eye } from "lucide-react";
import Link from "next/link";

interface Visit {
  id: string;
  visitorName: string;
  company: string;
  purpose: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export function VisitorDashboard() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    upcoming: 0,
    today: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    async function fetchVisits() {
      try {
        const response = await fetch("/api/visitors/my-visits");
        if (!response.ok) {
          throw new Error("Failed to fetch visits");
        }
        const data = await response.json();
        setVisits(data.visits || []);
        
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        setStats({
          upcoming: data.visits?.filter((v: Visit) => 
            new Date(v.scheduledDate) > now && v.status === "APPROVED"
          ).length || 0,
          today: data.visits?.filter((v: Visit) => {
            const visitDate = new Date(v.scheduledDate);
            return visitDate >= today && visitDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          }).length || 0,
          completed: data.visits?.filter((v: Visit) => v.status === "COMPLETED").length || 0,
          pending: data.visits?.filter((v: Visit) => v.status === "PENDING").length || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchVisits();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Visits today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/dashboard/visitors/register">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register New Visitor
          </Button>
        </Link>
        <Link href="/dashboard/visitors">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            View All Visits
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
          <CardDescription>Your recent visitor registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No visits registered yet.</p>
              <Link href="/dashboard/visitors/register">
                <Button variant="link" className="mt-2">
                  Register your first visitor
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.slice(0, 5).map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">{visit.visitorName}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Building className="h-3 w-3" />
                          {visit.company}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(visit.scheduledDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(visit.scheduledStart)} - {formatTime(visit.scheduledEnd)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {visit.purpose}
                      </span>
                    </div>
                    {visit.checkInTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Checked in: {formatTime(visit.checkInTime)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        visit.status
                      )}`}
                    >
                      {visit.status}
                    </span>
                    <Link href={`/dashboard/visitors/${visit.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {visits.length > 5 && (
                <Link href="/dashboard/visitors">
                  <Button variant="outline" className="w-full">
                    View All {visits.length} Visits
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



