import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient("https://greedy-toucan-768.convex.cloud");
const brands = await client.query(api.brands.listAll, {});
console.log(JSON.stringify({
  total: brands.length,
  active: brands.filter(b => b.isActive !== false).length,
  inactive: brands.filter(b => b.isActive === false).length,
  sample: brands.slice(0, 3).map(b => ({name: b.name, isActive: b.isActive, slug: b.slug}))
}));
