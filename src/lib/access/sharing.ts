import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { hash } from "@/lib/utils/crypto";
import { hasPermission, isResourceOwner } from "./dac";


export function generateSharingToken(): string {
  return randomBytes(32).toString("base64url");
}


export async function createSharingLink(
  resourceType: string,
  resourceId: string,
  createdBy: string,
  options: {
    canRead?: boolean;
    canWrite?: boolean;
    canExecute?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    expiresAt?: Date;
    maxUses?: number;
    password?: string;
    requireAuth?: boolean;
    allowedEmails?: string[];
    allowedDomains?: string[];
    name?: string;
    description?: string;
  }
) {
  
  const canShare = await hasPermission(createdBy, resourceType, resourceId, "share");
  const isOwner = await isResourceOwner(createdBy, resourceType, resourceId);

  if (!canShare.allowed && !isOwner) {
    throw new Error("You do not have permission to share this resource");
  }

  
  let resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  
  const token = generateSharingToken();

  
  const hashedPassword = options.password ? await hash(options.password) : null;

  
  const sharingLink = await prisma.sharingLink.create({
    data: {
      resourceId: resource.id,
      token,
      createdBy,
      canRead: options.canRead ?? true,
      canWrite: options.canWrite ?? false,
      canExecute: options.canExecute ?? false,
      canDelete: options.canDelete ?? false,
      canShare: options.canShare ?? false,
      expiresAt: options.expiresAt,
      maxUses: options.maxUses,
      password: hashedPassword,
      requireAuth: options.requireAuth ?? false,
      allowedEmails: options.allowedEmails ?? [],
      allowedDomains: options.allowedDomains ?? [],
      name: options.name,
      description: options.description,
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: createdBy,
      action: "dac.sharing_link_created",
      resource: resourceType,
      resourceId,
      securityLabel: "INTERNAL",
      details: {
        linkId: sharingLink.id,
        token: token.substring(0, 8) + "...", 
      },
    },
  });

  return {
    ...sharingLink,
    token, 
  };
}


export async function verifySharingLink(
  token: string,
  password?: string,
  userEmail?: string
): Promise<{ allowed: boolean; link?: any; reason?: string }> {
  const link = await prisma.sharingLink.findUnique({
    where: { token },
    include: {
      resource: {
        include: {
          securityLabel: true,
        },
      },
    },
  });

  if (!link) {
    return { allowed: false, reason: "Invalid sharing link" };
  }

  
  if (link.expiresAt && link.expiresAt < new Date()) {
    return { allowed: false, reason: "Sharing link has expired" };
  }

  
  if (link.maxUses && link.useCount >= link.maxUses) {
    return { allowed: false, reason: "Sharing link has reached maximum uses" };
  }

  
  if (link.password) {
    if (!password) {
      return { allowed: false, reason: "Password required" };
    }
    const hashedInput = await hash(password);
    if (hashedInput !== link.password) {
      return { allowed: false, reason: "Invalid password" };
    }
  }

  
  if (link.allowedEmails.length > 0) {
    if (!userEmail || !link.allowedEmails.includes(userEmail)) {
      return { allowed: false, reason: "Email not allowed" };
    }
  }

  
  if (link.allowedDomains.length > 0 && userEmail) {
    const domain = userEmail.split("@")[1];
    if (!domain || !link.allowedDomains.includes(domain)) {
      return { allowed: false, reason: "Domain not allowed" };
    }
  }

  
  if (link.requireAuth && !userEmail) {
    return { allowed: false, reason: "Authentication required" };
  }

  return { allowed: true, link };
}


export async function useSharingLink(token: string) {
  const link = await prisma.sharingLink.findUnique({
    where: { token },
  });

  if (!link) {
    throw new Error("Sharing link not found");
  }

  
  return await prisma.sharingLink.update({
    where: { token },
    data: {
      useCount: {
        increment: 1,
      },
      lastUsedAt: new Date(),
    },
  });
}


export async function revokeSharingLink(
  linkId: string,
  revokedBy: string
) {
  const link = await prisma.sharingLink.findUnique({
    where: { id: linkId },
    include: {
      resource: true,
    },
  });

  if (!link) {
    throw new Error("Sharing link not found");
  }

  
  const canShare = await hasPermission(
    revokedBy,
    link.resource.type,
    link.resource.resourceId,
    "share"
  );
  const isOwner = await isResourceOwner(
    revokedBy,
    link.resource.type,
    link.resource.resourceId
  );

  if (!canShare.allowed && !isOwner && link.createdBy !== revokedBy) {
    throw new Error("You do not have permission to revoke this link");
  }

  await prisma.sharingLink.delete({
    where: { id: linkId },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: revokedBy,
      action: "dac.sharing_link_revoked",
      resource: link.resource.type,
      resourceId: link.resource.resourceId,
      securityLabel: "INTERNAL",
      details: {
        linkId,
      },
    },
  });
}


export async function getResourceSharingLinks(
  resourceType: string,
  resourceId: string,
  userId: string
) {
  
  const canShare = await hasPermission(userId, resourceType, resourceId, "share");
  const isOwner = await isResourceOwner(userId, resourceType, resourceId);

  if (!canShare.allowed && !isOwner) {
    throw new Error("You do not have permission to view sharing links");
  }

  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
    include: {
      sharingLinks: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return resource?.sharingLinks ?? [];
}



