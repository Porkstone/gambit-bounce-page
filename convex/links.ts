import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple encryption/decryption using base64 encoding with a basic cipher
// Note: This is for demonstration. In production, use proper encryption libraries
function encryptData(data: string): string {
  const encoded = btoa(data);
  // Simple character shifting for obfuscation
  return encoded.split('').map(char => 
    String.fromCharCode(char.charCodeAt(0) + 3)
  ).join('');
}

function decryptData(encryptedData: string): string {
  try {
    // Reverse the character shifting
    const decoded = encryptedData.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) - 3)
    ).join('');
    return atob(decoded);
  } catch {
    throw new Error("Invalid encrypted data");
  }
}

export const createTrackingLink = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    targetUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Create the data payload
    const payload = JSON.stringify({
      name: args.name,
      email: args.email,
      url: args.targetUrl,
    });
    
    // Encrypt the payload
    const encryptedData = encryptData(payload);
    
    // Get the Convex site URL for the tracking endpoint
    const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:3000";
    return `${siteUrl}/track?data=${encodeURIComponent(encryptedData)}`;
  },
});

export const processTrackingClick = mutation({
  args: {
    encryptedData: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Decrypt the data
      const decryptedPayload = decryptData(args.encryptedData);
      const data = JSON.parse(decryptedPayload);
      
      // Validate the data structure
      if (!data.name || !data.email || !data.url) {
        throw new Error("Invalid data structure");
      }
      
      // Store the click data
      await ctx.db.insert("linkClicks", {
        name: data.name,
        email: data.email,
        targetUrl: data.url,
        clickedAt: Date.now(),
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
        suppressChatDomain: typeof data.suppressChatDomain === "string" ? data.suppressChatDomain : undefined,
      });
      
      return {
        success: true,
        redirectUrl: data.url,
        name: data.name,
        email: data.email,
        suppressChatDomain: typeof data.suppressChatDomain === "string" ? data.suppressChatDomain : undefined,
      };
    } catch (error) {
      console.error("Error processing tracking click:", error);
      return {
        success: false,
        error: "Invalid or corrupted tracking link",
      };
    }
  },
});

export const getClickAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const clicks = await ctx.db.query("linkClicks")
      .order("desc")
      .take(100);
    
    return clicks;
  },
});

export const getClicksByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const clicks = await ctx.db.query("linkClicks")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .collect();
    
    return clicks;
  },
});

export const getClickStats = query({
  args: {},
  handler: async (ctx) => {
    const allClicks = await ctx.db.query("linkClicks").collect();
    
    const totalClicks = allClicks.length;
    const uniqueEmails = new Set(allClicks.map(click => click.email)).size;
    const uniqueUrls = new Set(allClicks.map(click => click.targetUrl)).size;
    
    // Get clicks from last 24 hours
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentClicks = allClicks.filter(click => click.clickedAt > last24Hours).length;
    
    return {
      totalClicks,
      uniqueEmails,
      uniqueUrls,
      recentClicks,
    };
  },
});
