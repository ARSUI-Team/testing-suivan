import { NextRequest, NextResponse } from "next/server";
import {
  generateYieldRecommendation,
  fetchProtocolYields,
  getRebalanceRecommendation,
  AllocationStrategy,
} from "@/lib/ai-optimizer";

/**
 * POST /api/strategy
 * Analyzes current allocation and returns rebalancing recommendation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentAllocation, riskTolerance = "moderate" } = body;

    if (!currentAllocation || !Array.isArray(currentAllocation)) {
      return NextResponse.json(
        {
          success: false,
          error: "currentAllocation array is required",
        },
        { status: 400 }
      );
    }

    // Generate new recommendation
    const newRecommendation = await generateYieldRecommendation(riskTolerance);

    // Get rebalance analysis
    const rebalanceAnalysis = getRebalanceRecommendation(
      currentAllocation as AllocationStrategy[],
      newRecommendation
    );

    return NextResponse.json({
      success: true,
      data: {
        currentAllocation,
        newRecommendation,
        rebalanceAnalysis,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error analyzing strategy:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze strategy",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategy
 * Returns current optimal strategy without rebalancing analysis
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const riskTolerance = searchParams.get("risk") || "moderate";

    // Validate
    if (!["conservative", "moderate", "aggressive"].includes(riskTolerance)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid risk parameter. Must be: conservative, moderate, or aggressive",
        },
        { status: 400 }
      );
    }

    // Fetch yields and generate recommendation
    const protocols = await fetchProtocolYields();
    const recommendation = await generateYieldRecommendation(
      riskTolerance as "conservative" | "moderate" | "aggressive"
    );

    // Calculate current best single protocol
    const bestProtocol = protocols.reduce((best, current) =>
      current.apy > best.apy ? current : best
    );

    return NextResponse.json({
      success: true,
      data: {
        optimalStrategy: recommendation,
        protocols: protocols.map((p) => ({
          name: p.name,
          address: p.address,
          apy: Math.round(p.apy * 100) / 100,
          tvl: p.tvl,
          riskScore: p.riskScore,
        })),
        bestSingleProtocol: {
          name: bestProtocol.name,
          apy: Math.round(bestProtocol.apy * 100) / 100,
        },
        aiAdvantage: {
          diversifiedApy: Math.round(recommendation.expectedApy * 100) / 100,
          singleProtocolApy: Math.round(bestProtocol.apy * 100) / 100,
          riskReduction: "Diversified across multiple protocols",
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching strategy:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch strategy",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
