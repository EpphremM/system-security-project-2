/**
 * EXAMPLE: How Unified Access Control Works
 * 
 * This shows how all authorization mechanisms work together:
 * 1. RBAC - Role-based (USER, ADMIN, etc.)
 * 2. MAC - Security clearance (PUBLIC, CONFIDENTIAL, etc.)
 * 3. DAC - Resource ownership/sharing
 * 4. RuBAC - Time/location/device rules
 * 5. ABAC - Attribute-based policies
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Example 1: Simple RBAC check (role-based)
  const rbacCheck = await checkAccess(request, {
    resourceType: "visitor",
    resourceId: params.id,
    action: "read",
    routePath: "/dashboard/visitors",
    requiredPermission: "view_own_visits",
    checkRBAC: true, // Only check role
    checkMAC: false,
    checkDAC: false,
    checkRuBAC: false,
    checkABAC: false,
  });

  if (!rbacCheck.allowed) {
    return rbacCheck.response;
  }

  // Example 2: Full access control (all mechanisms)
  const fullCheck = await checkAccess(request, {
    resourceType: "visitor",
    resourceId: params.id,
    action: "read",
    routePath: "/dashboard/visitors",
    requiredPermission: "view_own_visits",
    checkRBAC: true,  // ✅ Check role
    checkMAC: true,   // ✅ Check security clearance
    checkDAC: true,   // ✅ Check ownership/sharing
    checkRuBAC: true, // ✅ Check time/location/device rules
    checkABAC: true,  // ✅ Check attribute policies
  });

  if (!fullCheck.allowed) {
    return fullCheck.response;
  }

  // Access granted - all checks passed
  return NextResponse.json({ message: "Access granted" });
}

