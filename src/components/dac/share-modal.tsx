"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Calendar } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  resourceType: string;
  resourceName: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

type Permission = "READ" | "WRITE" | "DELETE" | "SHARE";

export function ShareModal({
  open,
  onOpenChange,
  resourceId,
  resourceType,
  resourceName,
}: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/users?limit=100");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
      const newPermissions = { ...permissions };
      delete newPermissions[userId];
      setPermissions(newPermissions);
    } else {
      newSelected.add(userId);
      setPermissions({ ...permissions, [userId]: ["READ"] });
    }
    setSelectedUsers(newSelected);
  };

  const togglePermission = (userId: string, permission: Permission) => {
    const userPerms = permissions[userId] || [];
    const newPerms = userPerms.includes(permission)
      ? userPerms.filter((p) => p !== permission)
      : [...userPerms, permission];
    setPermissions({ ...permissions, [userId]: newPerms });
  };

  const handleShare = async () => {
    if (selectedUsers.size === 0) {
      setError("Please select at least one user");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const sharePromises = Array.from(selectedUsers).map((userId) => {
        const userPerms = permissions[userId] || ["READ"];
        return fetch("/api/access/dac/permissions/grant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId,
            userId,
            permissions: userPerms,
            expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
          }),
        });
      });

      await Promise.all(sharePromises);
      onOpenChange(false);
      
      setSelectedUsers(new Set());
      setPermissions({});
      setExpiryDate("");
      setSearchQuery("");
    } catch (err) {
      console.error("Share error:", err);
      setError("Failed to share resource. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share {resourceName}</DialogTitle>
          <DialogDescription>
            Grant access to other users. Select users and choose their permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.has(user.id);
                  const userPerms = permissions[user.id] || [];

                  return (
                    <div
                      key={user.id}
                      className={`p-3 hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{user.name || user.email}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      {/* Permissions */}
                      {isSelected && (
                        <div className="mt-3 ml-7 space-y-2">
                          <Label className="text-xs">Permissions:</Label>
                          <div className="flex flex-wrap gap-2">
                            {(["READ", "WRITE", "DELETE", "SHARE"] as Permission[]).map((perm) => (
                              <label
                                key={perm}
                                className="flex items-center gap-1.5 text-xs cursor-pointer"
                              >
                                <Checkbox
                                  checked={userPerms.includes(perm)}
                                  onCheckedChange={() => togglePermission(user.id, perm)}
                                />
                                <span>{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date (Optional)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Access will automatically expire on this date
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading || selectedUsers.size === 0}>
            {loading ? "Sharing..." : `Share with ${selectedUsers.size} user${selectedUsers.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



