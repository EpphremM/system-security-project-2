import { NextResponse } from "next/server";
import { cleanupUnverifiedUsers, cleanupExpiredTokens } from "@/lib/utils/verification";


export async function POST(request: Request) {
  try {
    
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CLEANUP_API_KEY}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cleanup expired tokens
    const deletedTokens = await cleanupExpiredTokens();

    // Cleanup unverified users (older than 7 days)
    const deletedUsers = await cleanupUnverifiedUsers(7);

    return NextResponse.json({
      success: true,
      deletedTokens,
      deletedUsers,
      message: `Cleaned up ${deletedTokens} expired tokens and ${deletedUsers} unverified users`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}





