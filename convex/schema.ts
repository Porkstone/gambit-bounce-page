import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  linkClicks: defineTable({
    name: v.string(),
    email: v.string(),
    targetUrl: v.string(),
    clickedAt: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  }).index("by_email", ["email"])
    .index("by_target_url", ["targetUrl"])
    .index("by_clicked_at", ["clickedAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
