

import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  
  const rbacCheck = await checkAccess(request, {
    resourceType: "visitor",
    resourceId: params.id,
    action: "read",
    routePath: "/dashboard/visitors",
    requiredPermission: "view_own_visits",
    checkRBAC: true, 
    checkMAC: false,
    checkDAC: false,
    checkRuBAC: false,
    checkABAC: false,
  });

  if (!rbacCheck.allowed) {
    return rbacCheck.response;
  }

  
  const fullCheck = await checkAccess(request, {
    resourceType: "visitor",
    resourceId: params.id,
    action: "read",
    routePath: "/dashboard/visitors",
    requiredPermission: "view_own_visits",
    checkRBAC: true,  
    checkMAC: true,   
    checkDAC: true,   
    checkRuBAC: true, 
    checkABAC: true,  
  });

  if (!fullCheck.allowed) {
    return fullCheck.response;
  }

  
  return NextResponse.json({ message: "Access granted" });
}

