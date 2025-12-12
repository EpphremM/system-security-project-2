import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
    const { policy, testAttributes } = body;

    // Evaluate policy against test attributes
    let allRulesMatch = true;
    const reasons: string[] = [];

    for (const rule of policy.rules) {
      const attributeValue = testAttributes[rule.attribute];
      let ruleMatches = false;

      switch (rule.operator) {
        case "EQUALS":
          ruleMatches = attributeValue === rule.value;
          break;
        case "CONTAINS":
          ruleMatches = String(attributeValue).includes(rule.value);
          break;
        case "GREATER_THAN":
          ruleMatches = Number(attributeValue) > Number(rule.value);
          break;
        case "LESS_THAN":
          ruleMatches = Number(attributeValue) < Number(rule.value);
          break;
        case "IN":
          const values = rule.value.split(",").map((v: string) => v.trim());
          ruleMatches = values.includes(String(attributeValue));
          break;
      }

      if (!ruleMatches) {
        allRulesMatch = false;
        reasons.push(
          `Rule failed: ${rule.attribute} ${rule.operator} "${rule.value}" (actual: ${attributeValue})`
        );
      }
    }

    const allowed = policy.effect === "ALLOW" && allRulesMatch;

    return NextResponse.json({
      allowed,
      reason: reasons.length > 0 ? reasons.join("; ") : "All rules matched",
    });
  } catch (error) {
    console.error("Policy test error:", error);
    return NextResponse.json(
      { error: "Failed to test policy" },
      { status: 500 }
    );
  }
}


