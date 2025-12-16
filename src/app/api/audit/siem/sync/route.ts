import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncToSIEM, autoSyncSIEM } from "@/lib/logging/siem";
import { z } from "zod";

const syncSchema = z.object({
  siemId: z.string().uuid().optional(),
  logIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { siemId, logIds } = parsed.data;

    if (siemId) {
      
      const result = await syncToSIEM(siemId, logIds);
      return NextResponse.json({
        success: result.success,
        synced: result.synced,
        failed: result.failed,
      });
    } else {
      
      const result = await autoSyncSIEM();
      return NextResponse.json({
        success: true,
        synced: result.synced,
        failed: result.failed,
      });
    }
  } catch (error) {
    console.error("SIEM sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync SIEM" },
      { status: 500 }
    );
  }
}



