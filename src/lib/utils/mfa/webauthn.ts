import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorDevice,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

const rpName = process.env.WEBAUTHN_RP_NAME || "Visitor Management System";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";


export async function generateWebAuthnRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { webauthnDevices: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const excludeCredentials = user.webauthnDevices.map((device) => ({
    id: device.credentialId,
    type: "public-key" as const,
    transports: device.transports as AuthenticatorTransport[],
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName,
    userDisplayName,
    timeout: 60000,
    attestationType: "none",
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
    authenticatorSelection: {
      authenticatorAttachment: "cross-platform",
      userVerification: "preferred",
      requireResidentKey: false,
    },
    supportedAlgorithmIDs: [-7, -257], 
  });

  return options;
}


export async function verifyWebAuthnRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    throw new Error(`Registration verification failed: ${error}`);
  }

  const { verified, registrationInfo } = verification;

  if (!verified || !registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credentialID, credentialPublicKey, counter } = registrationInfo;

  // Store the device
  await prisma.webAuthnDevice.create({
    data: {
      userId,
      credentialId: Buffer.from(credentialID).toString("base64url"),
      publicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
      transports: response.response.transports || [],
      deviceName: deviceName || "Unknown Device",
    },
  });

  return { verified, credentialID };
}

/**
 * Generate WebAuthn authentication options
 */
export async function generateWebAuthnAuthenticationOptions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { webauthnDevices: true },
  });

  if (!user || user.webauthnDevices.length === 0) {
    throw new Error("No WebAuthn devices found for user");
  }

  const allowCredentials = user.webauthnDevices.map((device) => ({
    id: device.credentialId,
    type: "public-key" as const,
    transports: device.transports as AuthenticatorTransport[],
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
    timeout: 60000,
  });

  return options;
}

/**
 * Verify WebAuthn authentication response
 */
export async function verifyWebAuthnAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const device = await prisma.webAuthnDevice.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });

  if (!device || device.userId !== userId) {
    throw new Error("Device not found or does not belong to user");
  }

  const publicKey = Buffer.from(device.publicKey, "base64");
  const credentialID = Buffer.from(device.credentialId, "base64url");

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID,
        credentialPublicKey: publicKey,
        counter: device.counter,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    throw new Error(`Authentication verification failed: ${error}`);
  }

  const { verified, authenticationInfo } = verification;

  if (!verified) {
    throw new Error("Authentication verification failed");
  }

  // Update device counter and last used timestamp
  await prisma.webAuthnDevice.update({
    where: { id: device.id },
    data: {
      counter: authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  return { verified };
}



