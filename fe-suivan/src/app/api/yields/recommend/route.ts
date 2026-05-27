import { NextRequest, NextResponse } from "next/server";
import { generateYieldRecommendation } from "@/lib/ai-optimizer";

/**
 * POST /api/yields/recommend
 * Returns AI-generated yield optimization recommendation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const riskTolerance = body.riskTolerance || "moderate";

    // Validate risk tolerance
    if (!["conservative", "moderate", "aggressive"].includes(riskTolerance)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid risk tolerance. Must be: conservative, moderate, or aggressive",
        },
        { status: 400 }
      );
    }

    // Generate recommendation
    const recommendation = await generateYieldRecommendation(riskTolerance);

    return NextResponse.json({
      success: true,
      data: {
        recommendation,
        riskTolerance,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate recommendation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/yields/recommend
 * Returns recommendation with default moderate risk
 */
export async function GET() {
  try {
    const recommendation = await generateYieldRecommendation("moderate");

    return NextResponse.json({
      success: true,
      data: {
        recommendation,
        riskTolerance: "moderate",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate recommendation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
