import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Handle tracking link redirects
http.route({
  path: "/track",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const encryptedData = url.searchParams.get("data");
    
    if (!encryptedData) {
      return new Response("Invalid tracking link", { status: 400 });
    }

    try {
      const result = await ctx.runMutation(api.links.processTrackingClick, {
        encryptedData: decodeURIComponent(encryptedData),
        userAgent: request.headers.get("user-agent") || undefined,
        ipAddress: request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   undefined,
      });

      if (result.success) {
        // Redirect to the target URL
        return new Response(null, {
          status: 302,
          headers: {
            "Location": result.redirectUrl,
          },
        });
      } else {
        return new Response(result.error || "Invalid tracking link", { status: 400 });
      }
    } catch (error) {
      console.error("Error processing tracking link:", error);
      return new Response("Failed to process tracking link", { status: 500 });
    }
  }),
});

// API endpoint to create tracking links
http.route({
  path: "/api/create-link",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Validate required fields
      if (!body.name || !body.email || !body.targetUrl) {
        return new Response(JSON.stringify({
          error: "Missing required fields: name, email, targetUrl"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return new Response(JSON.stringify({
          error: "Invalid email format"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate URL format
      try {
        new URL(body.targetUrl);
      } catch {
        return new Response(JSON.stringify({
          error: "Invalid target URL format"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Create the tracking link
      const trackingLink = await ctx.runMutation(api.links.createTrackingLink, {
        name: body.name,
        email: body.email,
        targetUrl: body.targetUrl,
      });

      return new Response(JSON.stringify({
        success: true,
        trackingLink,
        name: body.name,
        email: body.email,
        targetUrl: body.targetUrl
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });

    } catch (error) {
      console.error("Error creating tracking link:", error);
      return new Response(JSON.stringify({
        error: "Failed to create tracking link"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }),
});

// Handle CORS preflight requests
http.route({
  path: "/api/create-link",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }),
});

export default http;
