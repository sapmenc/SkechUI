import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
 
//whatever table you want to add for your application
const schema = defineSchema({
  ...authTables,
  // Your other tables...
});
 
export default schema;