"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, Building, Mail, Phone, User, Shield, CheckCircle, XCircle, AlertCircle, Edit, Save, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ClearanceBadge } from "@/components/mac/clearance-badge";
import Link from "next/link";

interface VisitorDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  company: string;
  purpose: string;
  securityLabel: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  status: string;
  qrCode: string | null;
  badgeNumber: string | null;
  host: {
    id: string;
    name: string | null;
    email: string;
    department: string;
  };
  approvedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  approvalDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function VisitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [visitor, setVisitor] = useState<VisitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    purpose: "",
    scheduledDate: "",
    scheduledStart: "",
    scheduledEnd: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchVisitor(params.id as string);
    }
  }, [params.id]);

  const fetchVisitor = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/visitors/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Visitor not found");
        } else if (response.status === 403) {
          setError("You don't have permission to view this visitor");
        } else {
          setError("Failed to load visitor details");
        }
        return;
      }

      const data = await response.json();
      setVisitor(data.visitor);
      
      setEditForm({
        firstName: data.visitor.firstName,
        lastName: data.visitor.lastName,
        email: data.visitor.email || "",
        phone: data.visitor.phone,
        company: data.visitor.company,
        purpose: data.visitor.purpose,
        scheduledDate: data.visitor.scheduledDate.split("T")[0],
        scheduledStart: new Date(data.visitor.scheduledStart).toISOString().slice(0, 16),
        scheduledEnd: new Date(data.visitor.scheduledEnd).toISOString().slice(0, 16),
      });

      const canEditResponse = await fetch(`/api/visitors/${id}/can-edit`);
      if (canEditResponse.ok) {
        const canEditData = await canEditResponse.json();
        setCanEdit(canEditData.canEdit || false);
      }
    } catch (err) {
      console.error("Failed to fetch visitor:", err);
      setError("Failed to load visitor details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!visitor) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        company: editForm.company,
        purpose: editForm.purpose,
      };

      if (editForm.email !== undefined) {
        updateData.email = editForm.email || null;
      }

      if (editForm.scheduledDate) {
        const date = new Date(editForm.scheduledDate);
        date.setHours(0, 0, 0, 0);
        updateData.scheduledDate = date.toISOString();
      }

      if (editForm.scheduledStart) {
        updateData.scheduledStart = new Date(editForm.scheduledStart).toISOString();
      }

      if (editForm.scheduledEnd) {
        updateData.scheduledEnd = new Date(editForm.scheduledEnd).toISOString();
      }

      const response = await fetch(`/api/visitors/${visitor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.message || data.error || "Failed to update visitor";
        const details = data.details ? ` (${data.details.map((d: any) => `${d.path?.join('.') || 'field'}: ${d.message}`).join(', ')})` : '';
        setError(errorMessage + details);
        console.error("Update error:", data);
        return;
      }

      const data = await response.json();
      setIsEditing(false);
      await fetchVisitor(visitor.id);
    } catch (err) {
      console.error("Failed to update visitor:", err);
      setError("Failed to update visitor. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (visitor) {
      setEditForm({
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: visitor.email || "",
        phone: visitor.phone,
        company: visitor.company,
        purpose: visitor.purpose,
        scheduledDate: visitor.scheduledDate.split("T")[0],
        scheduledStart: new Date(visitor.scheduledStart).toISOString().slice(0, 16),
        scheduledEnd: new Date(visitor.scheduledEnd).toISOString().slice(0, 16),
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "CHECKED_IN":
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case "CHECKED_OUT":
        return <CheckCircle className="h-5 w-5 text-gray-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PENDING":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-800" },
      APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-800" },
      CHECKED_IN: { label: "Checked In", className: "bg-green-100 text-green-800" },
      CHECKED_OUT: { label: "Checked Out", className: "bg-gray-100 text-gray-800" },
      REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
      EXPIRED: { label: "Expired", className: "bg-orange-100 text-orange-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className} flex items-center gap-2`}>
        {getStatusIcon(status)}
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !visitor) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/visitors")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Visitors
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-red-600">{error || "Visitor not found"}</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/visitors")}
              >
                Return to Visitors List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/visitors")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {visitor.firstName} {visitor.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">Visitor Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(visitor.status)}
          <ClearanceBadge clearance={visitor.securityLabel} />
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {}
      <div className="grid gap-6 md:grid-cols-2">
        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    disabled={saving}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select
                    value={editForm.purpose}
                    onValueChange={(value) => setEditForm({ ...editForm, purpose: value })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="INTERVIEW">Interview</SelectItem>
                      <SelectItem value="DELIVERY">Delivery</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="TOUR">Tour</SelectItem>
                      <SelectItem value="TRAINING">Training</SelectItem>
                      <SelectItem value="CONSULTATION">Consultation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-base">{visitor.firstName} {visitor.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-base">{visitor.email || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </label>
                  <p className="text-base">{visitor.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company
                  </label>
                  <p className="text-base">{visitor.company}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Purpose</label>
                  <p className="text-base capitalize">{visitor.purpose.toLowerCase().replace("_", " ")}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Visit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={editForm.scheduledDate}
                    onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledStart" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Time
                  </Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={editForm.scheduledStart}
                    onChange={(e) => setEditForm({ ...editForm, scheduledStart: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledEnd" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Time
                  </Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    value={editForm.scheduledEnd}
                    onChange={(e) => setEditForm({ ...editForm, scheduledEnd: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled Date</label>
                  <p className="text-base">
                    {new Date(visitor.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Scheduled Time
                  </label>
                  <p className="text-base">
                    {new Date(visitor.scheduledStart).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - {new Date(visitor.scheduledEnd).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </>
            )}
            {visitor.actualCheckIn && (
              <div>
                <label className="text-sm font-medium text-gray-500">Check-In Time</label>
                <p className="text-base">
                  {new Date(visitor.actualCheckIn).toLocaleString()}
                </p>
              </div>
            )}
            {visitor.actualCheckOut && (
              <div>
                <label className="text-sm font-medium text-gray-500">Check-Out Time</label>
                <p className="text-base">
                  {new Date(visitor.actualCheckOut).toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Host</label>
              <p className="text-base">
                {visitor.host.name || visitor.host.email} ({visitor.host.department})
              </p>
            </div>
            {visitor.approvedBy && (
              <div>
                <label className="text-sm font-medium text-gray-500">Approved By</label>
                <p className="text-base">
                  {visitor.approvedBy.name || visitor.approvedBy.email}
                  {visitor.approvalDate && (
                    <span className="text-sm text-gray-500 ml-2">
                      on {new Date(visitor.approvalDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      {(visitor.qrCode || visitor.badgeNumber) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Badge Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visitor.badgeNumber && (
              <div>
                <label className="text-sm font-medium text-gray-500">Badge Number</label>
                <p className="text-base font-mono">{visitor.badgeNumber}</p>
              </div>
            )}
            {visitor.qrCode && (
              <div>
                <label className="text-sm font-medium text-gray-500">QR Code</label>
                <p className="text-base font-mono text-xs break-all">{visitor.qrCode}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>Created: {new Date(visitor.createdAt).toLocaleString()}</p>
          <p>Last Updated: {new Date(visitor.updatedAt).toLocaleString()}</p>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

