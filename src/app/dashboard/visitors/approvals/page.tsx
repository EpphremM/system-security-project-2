"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, User, Building, Calendar, Shield } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ClearanceBadge } from "@/components/mac/clearance-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Approval {
  id: string;
  visitorId: string;
  visitor: {
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
    host: {
      id: string;
      name: string | null;
      email: string;
      department: string;
    };
  };
  host: {
    id: string;
    name: string | null;
    email: string;
    department: string;
  };
  status: string;
  requestedAt: string;
  requiresSecurityClearance: boolean;
  securityClearanceChecked: boolean;
  escalationReason?: string;
  escalatedAt?: string;
}

export default function VisitorApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/visitors/approvals/pending");
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApproval) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/visitors/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedApproval.id,
          action: actionType,
          checkSecurityClearance: selectedApproval.requiresSecurityClearance && !selectedApproval.securityClearanceChecked,
          notes: notes || undefined,
          reason: actionType === "REJECT" ? notes : undefined,
        }),
      });

      if (response.ok) {
        setActionDialogOpen(false);
        setSelectedApproval(null);
        setNotes("");
        fetchApprovals(); // Refresh list
      } else {
        const error = await response.json();
        alert(error.error || "Failed to process approval");
      }
    } catch (error) {
      console.error("Approval action error:", error);
      alert("Failed to process approval");
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (approval: Approval, type: "APPROVE" | "REJECT") => {
    setSelectedApproval(approval);
    setActionType(type);
    setNotes("");
    setActionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Visitor Approvals</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and approve pending visitor requests
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">No pending approvals</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {approval.visitor.firstName} {approval.visitor.lastName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {approval.visitor.email} • {approval.visitor.phone}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClearanceBadge clearance={approval.visitor.securityLabel} />
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      approval.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      approval.status === "ESCALATED" ? "bg-orange-100 text-orange-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {approval.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Company</Label>
                    <p className="text-base">{approval.visitor.company}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Purpose</Label>
                    <p className="text-base capitalize">{approval.visitor.purpose.toLowerCase().replace("_", " ")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Host
                    </Label>
                    <p className="text-base">
                      {approval.host.name || approval.host.email} ({approval.host.department})
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Scheduled Date
                    </Label>
                    <p className="text-base">
                      {new Date(approval.visitor.scheduledDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(approval.visitor.scheduledStart).toLocaleTimeString()} - {new Date(approval.visitor.scheduledEnd).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {approval.requiresSecurityClearance && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Security clearance {approval.securityClearanceChecked ? "checked" : "required"}
                    </span>
                  </div>
                )}

                {approval.escalationReason && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm font-medium text-orange-800">Escalation Reason:</p>
                    <p className="text-sm text-orange-700">{approval.escalationReason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => openActionDialog(approval, "APPROVE")}
                    className="flex-1"
                    variant="default"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => openActionDialog(approval, "REJECT")}
                    className="flex-1"
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" ? "Approve Visitor" : "Reject Visitor"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE"
                ? "Approve this visitor request. You can add optional notes."
                : "Reject this visitor request. Please provide a reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">
                {actionType === "APPROVE" ? "Notes (optional)" : "Reason (required)"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === "APPROVE" ? "Add any notes about this approval..." : "Explain why this request is being rejected..."}
                rows={4}
                required={actionType === "REJECT"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === "REJECT" && !notes.trim())}
              variant={actionType === "APPROVE" ? "default" : "destructive"}
            >
              {processing ? "Processing..." : actionType === "APPROVE" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

