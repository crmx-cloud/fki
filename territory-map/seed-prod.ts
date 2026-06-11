import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient("https://disciplined-cobra-64.convex.cloud");

async function main() {
  console.log("Seeding production database...");
  try {
    const result = await client.mutation(api.seed.seedBrands, {});
    console.log("Seed result:", result);
  } catch (e: any) {
    console.error("Seed error:", e.message);
  }
  
  // F500 import - needs auth, so let's skip for now
  console.log("Done!");
}

main();
