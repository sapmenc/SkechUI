import { defineSchema,defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import {v} from "convex/values";

// v.number() //column becomes a number
 //whatever we wanna create that goes right inside this function.
const schema = defineSchema({
  ...authTables,
  // Your other tables...

  subscriptions:defineTable({
     userId:v.id("users"),
     polarCustomerId:v.string(),
     polarSubscriptionId:v.string(),
     productId:v.optional(v.string()),
     priceId:v.optional(v.string()),
     planCode:v.optional(v.string()),     
     status:v.string(),
     currentPeriodEnd:v.optional(v.number()),
     trialEndsAt:v.optional(v.number()),
     cancelAt:v.optional(v.number()),
     canceledAt:v.optional(v.number()),
     seats:v.optional(v.number()),
     metadata:v.optional(v.any()),
     creditsBalance:v.number(),
     creditsGrantPerPeriod:v.number(),
     creditsRolloverLimit:v.number(),
     lastGrantCursor:v.optional(v.string())
  }) .index("by_userId", ["userId"]),

  credits_ledger:defineTable({
     userId:v.id("users"),
     subscriptionId:v.id("subscriptions"),
     amount:v.number(),
     type:v.string(),// grant / consume / adjust
     reason:v.optional(v.string()),
     idempotencyKey:v.optional(v.string()),
     meta:v.optional(v.any())
  }).index('by_subscriptionId',['subscriptionId'])
     .index('by_userId',['userId'])
     .index('by_idempotencyKey',['idempotencyKey']),
     
  projects:defineTable({
     userId:v.id("users"), //reference to user table
     name:v.string(),
     description:v.optional(v.string()),
     styleGuide:v.optional(v.string()),
     sketchesData:v.any(), //json structure matching redux shapes state
     viewportData:v.optional(v.any()), //json structure for viewport state
     generatedDesignData:v.optional(v.any()), //json structure for generated ui components
     thumbnail:v.optional(v.string()), //Base64 or url for project thumbnail
     moodBoardImages:v.optional(v.array(v.string())), //array of storage IDs for moods
     inspirationImages:v.optional(v.array(v.string())), //array of storage IDs for inspiration images(max 6)
     lastModified:v.number(), //timestamp for larst modification
     createdAt:v.number(), //project creation timestamp
     isPublic:v.optional(v.boolean()), //for future sharing features
     tags:v.optional(v.array(v.string())), //for future categorization
     projectNumber:v.number() //auto increamenting project number per user
  }).index("by_userId",["userId"]).index("by_userId_lastModified", ["userId", "lastModified"]), //to faster query to get results by userId

  project_counters:defineTable({
     userId:v.id("users"),
     nextProjectNumber:v.number() //next available project number for a user
  }).index("by_userId",["userId"]), //to faster quesry to get results by userId

});
 
export default schema;