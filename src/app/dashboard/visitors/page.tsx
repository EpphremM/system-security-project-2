"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, Share2 } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { ClearanceBadge } from "@/components/mac/clearance-badge";
import { ShareModal } from "@/components/dac/share-modal";
import { SecurityLevel } from "@/generated/prisma/enums";

interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  company: string;
  purpose: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  securityLabel?: SecurityLevel;
}

export default function VisitorsPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "CHECKED_IN" | "CHECKED_OUT">("ALL");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [sharedVisitors, setSharedVisitors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"my" | "shared">("my");

  useEffect(() => {
    if (activeTab === "my") {
      fetchVisitors();
    } else {
      fetchSharedVisitors();
    }
  }, [filter, activeTab]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/visitors/my-visits");
      if (response.ok) {
        const data = await response.json();
        console.log("Visitors API response:", data);
        
        const visitsList = data.recentVisits || data.visits || [];
        console.log("Visitors found:", visitsList.length);
        
        const transformedVisitors = visitsList.map((visit: any) => ({
          id: visit.id,
          firstName: visit.firstName || "",
          lastName: visit.lastName || "",
          email: visit.email || null,
          phone: visit.phone || "",
          company: visit.company || "",
          purpose: visit.purpose || "",
          status: visit.status || "PENDING",
          securityLabel: (visit.securityLabel as SecurityLevel) || "PUBLIC",
          scheduledStart: visit.scheduledStart || "",
          scheduledEnd: visit.scheduledEnd || "",
          hostId: visit.hostId,
          host: visit.host,
          canEdit: visit.canEdit !== false,
        }));
        setVisitors(transformedVisitors);
        console.log("Transformed visitors:", transformedVisitors.length);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch visitors:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedVisitors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/visitors/shared");
      if (response.ok) {
        const data = await response.json();
        setSharedVisitors(data.visitors || []);
      }
    } catch (error) {
      console.error("Failed to fetch shared visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisitors = (activeTab === "my" ? visitors : sharedVisitors).filter((visitor: any) => {
    const matchesSearch =
      searchQuery === "" ||
      visitor.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeTab === "shared" || filter === "ALL" || visitor.status === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-800" },
      CHECKED_IN: { label: "Checked In", className: "bg-green-100 text-green-800" },
      CHECKED_OUT: { label: "Checked Out", className: "bg-gray-100 text-gray-800" },
      REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visitors</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track visitor registrations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/visitors/register">
            <Plus className="h-4 w-4 mr-2" />
            Add Visitor
          </Link>
        </Button>
      </div>

      {}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "my" ? "default" : "ghost"}
          onClick={() => setActiveTab("my")}
          className="rounded-b-none"
        >
          My Visitors
        </Button>
        <Button
          variant={activeTab === "shared" ? "default" : "ghost"}
          onClick={() => setActiveTab("shared")}
          className="rounded-b-none"
        >
          Shared With Me
        </Button>
      </div>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === "my" && (
              <div className="flex gap-2">
                {(["ALL", "PENDING", "APPROVED", "CHECKED_IN", "CHECKED_OUT"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f.replace("_", " ")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "my" ? "My Visitors" : "Shared With Me"}
          </CardTitle>
          <CardDescription>
            {filteredVisitors.length} visitor{filteredVisitors.length !== 1 ? "s" : ""} found
            {activeTab === "shared" && " (with shared access)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredVisitors.length === 0 ? (
            <EmptyState
              title="No visitors found"
              description={
                searchQuery || filter !== "ALL"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by registering a new visitor"
              }
              icon={<Users className="h-12 w-12 text-gray-400" />}
              action={
                !searchQuery && filter === "ALL"
                  ? {
                      label: "Add Visitor",
                      onClick: () => router.push("/dashboard/visitors/register"),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Company</th>
                    <th className="text-left p-4 font-semibold">Purpose</th>
                    <th className="text-left p-4 font-semibold">Security</th>
                    {activeTab === "my" && (
                      <th className="text-left p-4 font-semibold">Host</th>
                    )}
                    {activeTab === "shared" && (
                      <th className="text-left p-4 font-semibold">Permissions</th>
                    )}
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Scheduled</th>
                    {activeTab === "shared" && (
                      <th className="text-left p-4 font-semibold">Shared By</th>
                    )}
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.map((visitor: any) => (
                    <tr key={visitor.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {visitor.firstName} {visitor.lastName}
                      </td>
                      <td className="p-4">{visitor.email || "-"}</td>
                      <td className="p-4">{visitor.company}</td>
                      <td className="p-4">{visitor.purpose}</td>
                      <td className="p-4">
                        <ClearanceBadge 
                          clearance={visitor.securityLabel || "PUBLIC"} 
                          size="sm"
                        />
                      </td>
                      {activeTab === "my" && (
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{(visitor as any).host?.name || (visitor as any).host?.email || "Unknown"}</div>
                            {(visitor as any).host?.email && (
                              <div className="text-xs text-muted-foreground">{(visitor as any).host.email}</div>
                            )}
                          </div>
                        </td>
                      )}
                      {activeTab === "shared" && (
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {visitor.permissions?.read && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">READ</span>
                            )}
                            {visitor.permissions?.write && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">WRITE</span>
                            )}
                            {visitor.permissions?.delete && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">DELETE</span>
                            )}
                            {visitor.permissions?.share && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">SHARE</span>
                            )}
                            {!visitor.permissions?.read && !visitor.permissions?.write && 
                             !visitor.permissions?.delete && !visitor.permissions?.share && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">No permissions</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-4">{getStatusBadge(visitor.status)}</td>
                      <td className="p-4">
                        {visitor.scheduledStart
                          ? new Date(visitor.scheduledStart).toLocaleDateString()
                          : "-"}
                      </td>
                      {activeTab === "shared" && (
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{visitor.sharedBy?.name || visitor.sharedBy?.email || "Unknown"}</div>
                            {visitor.expiresAt && (
                              <div className="text-xs text-muted-foreground">
                                Expires: {new Date(visitor.expiresAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/visitors/${visitor.id}`)}
                            disabled={activeTab === "shared" && !visitor.permissions?.read}
                          >
                            View
                          </Button>
                          {activeTab === "my" && (visitor as any).canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVisitor(visitor);
                                setShareModalOpen(true);
                              }}
                              title="Share visitor record"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {selectedVisitor && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          resourceId={selectedVisitor.id}
          resourceType="visitor"
          resourceName={`${selectedVisitor.firstName} ${selectedVisitor.lastName}`}
        />
      )}
    </div>
  );
}

