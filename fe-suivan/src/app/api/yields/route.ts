import { NextRequest, NextResponse } from "next/server";
import {
  fetchProtocolYields,
  getMarketConditions,
  getHistoricalPerformance,
} from "@/lib/ai-optimizer";

/**
 * GET /api/yields
 * Returns current yield data for all protocols
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get("history") === "true";
    const historyDays = parseInt(searchParams.get("days") || "30");

    // Fetch current yields
    const protocols = await fetchProtocolYields();
    const market = getMarketConditions();

    // Calculate aggregate stats
    const avgApy = protocols.reduce((sum, p) => sum + p.apy, 0) / protocols.length;
    const maxApy = Math.max(...protocols.map((p) => p.apy));
    const minApy = Math.min(...protocols.map((p) => p.apy));
    const totalTvl = protocols.reduce((sum, p) => sum + p.tvl, 0);

    const response: {
      success: boolean;
      data: {
        protocols: typeof protocols;
        market: typeof market;
        stats: {
          avgApy: number;
          maxApy: number;
          minApy: number;
          totalTvl: number;
          protocolCount: number;
        };
        history?: ReturnType<typeof getHistoricalPerformance>;
      };
      timestamp: string;
    } = {
      success: true,
      data: {
        protocols,
        market,
        stats: {
          avgApy: Math.round(avgApy * 100) / 100,
          maxApy: Math.round(maxApy * 100) / 100,
          minApy: Math.round(minApy * 100) / 100,
          totalTvl,
          protocolCount: protocols.length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Include history if requested
    if (includeHistory) {
      response.data.history = getHistoricalPerformance(historyDays);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching yields:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch yield data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
