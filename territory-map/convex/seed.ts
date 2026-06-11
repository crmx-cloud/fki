import { mutation } from "./_generated/server";

export const seedBrands = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("brands").collect();
    if (existing.length > 0) {
      return { message: "Already seeded", brands: existing.length };
    }

    // Seed categories
    const cats = [
      { name: "Food & Beverage", slug: "food-beverage", icon: "🍽️" },
      { name: "Health & Wellness", slug: "health-wellness", icon: "💪" },
      { name: "Services", slug: "services", icon: "🛠️" },
      { name: "Retail", slug: "retail", icon: "🛍️" },
      { name: "Education & Children", slug: "education-children", icon: "📚" },
      { name: "Home Services", slug: "home-services", icon: "🏠" },
      { name: "Fitness", slug: "fitness", icon: "🏋️" },
      { name: "Automotive", slug: "automotive", icon: "🚗" },
    ];
    for (const cat of cats) {
      await ctx.db.insert("categories", cat);
    }

    // ── Salad House ──
    const sh = await ctx.db.insert("brands", {
      name: "Salad House",
      slug: "salad-house",
      description: "Fast-casual restaurant featuring customizable salads, grain bowls, smoothies and wraps with locally sourced ingredients.",
      category: "Food & Beverage",
      investmentMin: 250000,
      investmentMax: 450000,
      franchiseFee: 35000,
      royaltyPercent: 6,
      isActive: true,
      featured: true,
    });
    await ctx.db.insert("franchiseProfiles", {
      brandId: sh,
      yearFounded: 2011,
      totalUnits: 15,
      franchiseFee: 35000,
      royaltyPercent: 6,
      brandFundPercent: 2,
      liquidCapitalMin: 150000,
      totalInvestmentMin: 250000,
      totalInvestmentMax: 450000,
      avgUnitRevenue: 1600000,
      closureCount: 0,
      fddAvailable: true,
      item19Available: true,
      sbaApproved: true,
      isGrowing: true,
      corporateCity: "Somerville",
      corporateState: "NJ",
      brandStory: "Salad House is a fast-casual franchise committed to healthy living. Each location offers a menu of customizable salads, signature grain bowls, fresh-squeezed juices, smoothies, and wraps made with locally sourced, seasonal ingredients. With a proven operating model and strong unit economics, Salad House is expanding across the Northeast and Mid-Atlantic.",
    });

    // ── Indy Clover ──
    const ic = await ctx.db.insert("brands", {
      name: "Indy Clover",
      slug: "indy-clover",
      description: "Holistic wellness studio offering IV therapy, cryotherapy, infrared sauna and recovery services.",
      category: "Health & Wellness",
      investmentMin: 150000,
      investmentMax: 300000,
      franchiseFee: 40000,
      royaltyPercent: 7,
      isActive: true,
      featured: true,
    });
    await ctx.db.insert("franchiseProfiles", {
      brandId: ic,
      yearFounded: 2018,
      totalUnits: 8,
      franchiseFee: 40000,
      royaltyPercent: 7,
      brandFundPercent: 2,
      liquidCapitalMin: 100000,
      totalInvestmentMin: 150000,
      totalInvestmentMax: 300000,
      avgUnitRevenue: 650000,
      closureCount: 0,
      fddAvailable: true,
      item19Available: false,
      sbaApproved: false,
      isGrowing: true,
      corporateCity: "Indianapolis",
      corporateState: "IN",
      brandStory: "Indy Clover delivers a modern approach to wellness through a curated suite of recovery and rejuvenation services. From IV nutrient therapy to whole-body cryotherapy, infrared sauna, and compression therapy, Indy Clover studios attract health-conscious consumers seeking science-backed recovery solutions. The semi-absentee model and recurring membership revenue make it attractive for multi-unit operators.",
    });

    // ── Spoiled Rotten Photography ──
    const srp = await ctx.db.insert("brands", {
      name: "Spoiled Rotten Photography",
      slug: "spoiled-rotten-photography",
      description: "Mobile school and event photography franchise with a proprietary digital workflow and guaranteed same-week delivery.",
      category: "Services",
      investmentMin: 50000,
      investmentMax: 100000,
      franchiseFee: 25000,
      royaltyPercent: 8,
      isActive: true,
      featured: true,
    });
    await ctx.db.insert("franchiseProfiles", {
      brandId: srp,
      yearFounded: 2012,
      totalUnits: 45,
      franchiseFee: 25000,
      royaltyPercent: 8,
      brandFundPercent: 1,
      liquidCapitalMin: 30000,
      totalInvestmentMin: 50000,
      totalInvestmentMax: 100000,
      avgUnitRevenue: 180000,
      closureCount: 0,
      fddAvailable: true,
      item19Available: true,
      sbaApproved: false,
      isGrowing: true,
      corporateCity: "Atlanta",
      corporateState: "GA",
      brandStory: "Spoiled Rotten Photography (SRP) revolutionizes the school photography industry with a mobile-first approach. Franchisees bring professional studio lighting to schools, daycares, and community events, then deliver digitally retouched images within days — not weeks. The home-based model keeps overhead low, and recurring school contracts provide predictable annual revenue. SRP is ideal for owner-operators seeking flexibility.",
    });

    // ── Territories ──
    const shTerritories = [
      { city: "Hoboken", state: "NJ", lat: 40.744, lng: -74.032, status: "sold" as const },
      { city: "Jersey City", state: "NJ", lat: 40.728, lng: -74.078, status: "available" as const },
      { city: "Morristown", state: "NJ", lat: 40.797, lng: -74.481, status: "available" as const },
      { city: "Princeton", state: "NJ", lat: 40.357, lng: -74.660, status: "high_interest" as const },
      { city: "Red Bank", state: "NJ", lat: 40.347, lng: -74.064, status: "available" as const },
      { city: "Summit", state: "NJ", lat: 40.716, lng: -74.365, status: "available" as const },
      { city: "Westfield", state: "NJ", lat: 40.659, lng: -74.347, status: "pending_award" as const },
      { city: "Philadelphia", state: "PA", lat: 39.952, lng: -75.164, status: "available" as const },
      { city: "King of Prussia", state: "PA", lat: 40.089, lng: -75.396, status: "available" as const },
      { city: "New York City", state: "NY", lat: 40.713, lng: -74.006, status: "high_interest" as const },
      { city: "Brooklyn", state: "NY", lat: 40.678, lng: -73.944, status: "available" as const },
      { city: "Stamford", state: "CT", lat: 41.053, lng: -73.538, status: "available" as const },
    ];
    for (const t of shTerritories) {
      await ctx.db.insert("territories", { brandId: sh, city: t.city, state: t.state, latitude: t.lat, longitude: t.lng, status: t.status });
    }

    const icTerritories = [
      { city: "Indianapolis", state: "IN", lat: 39.768, lng: -86.158, status: "sold" as const },
      { city: "Carmel", state: "IN", lat: 39.978, lng: -86.118, status: "available" as const },
      { city: "Fishers", state: "IN", lat: 39.955, lng: -85.969, status: "available" as const },
      { city: "Bloomington", state: "IN", lat: 39.165, lng: -86.526, status: "available" as const },
      { city: "Fort Wayne", state: "IN", lat: 41.079, lng: -85.139, status: "high_interest" as const },
      { city: "Columbus", state: "OH", lat: 39.961, lng: -82.998, status: "available" as const },
      { city: "Cincinnati", state: "OH", lat: 39.103, lng: -84.512, status: "available" as const },
      { city: "Louisville", state: "KY", lat: 38.252, lng: -85.759, status: "available" as const },
    ];
    for (const t of icTerritories) {
      await ctx.db.insert("territories", { brandId: ic, city: t.city, state: t.state, latitude: t.lat, longitude: t.lng, status: t.status });
    }

    const srpTerritories = [
      { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, status: "sold" as const },
      { city: "Marietta", state: "GA", lat: 33.952, lng: -84.550, status: "available" as const },
      { city: "Alpharetta", state: "GA", lat: 34.075, lng: -84.294, status: "available" as const },
      { city: "Savannah", state: "GA", lat: 32.076, lng: -81.088, status: "available" as const },
      { city: "Charlotte", state: "NC", lat: 35.227, lng: -80.843, status: "high_interest" as const },
      { city: "Raleigh", state: "NC", lat: 35.780, lng: -78.639, status: "available" as const },
      { city: "Nashville", state: "TN", lat: 36.162, lng: -86.774, status: "available" as const },
      { city: "Tampa", state: "FL", lat: 27.950, lng: -82.457, status: "available" as const },
      { city: "Orlando", state: "FL", lat: 28.538, lng: -81.379, status: "pending_award" as const },
      { city: "Charleston", state: "SC", lat: 32.776, lng: -79.931, status: "available" as const },
    ];
    for (const t of srpTerritories) {
      await ctx.db.insert("territories", { brandId: srp, city: t.city, state: t.state, latitude: t.lat, longitude: t.lng, status: t.status });
    }

    return {
      message: "Seeded successfully",
      brands: 3,
      territories: shTerritories.length + icTerritories.length + srpTerritories.length,
      categories: cats.length,
    };
  },
});

export const clearAndReseed = mutation({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").collect();
    for (const b of brands) await ctx.db.delete(b._id);
    const territories = await ctx.db.query("territories").collect();
    for (const t of territories) await ctx.db.delete(t._id);
    const categories = await ctx.db.query("categories").collect();
    for (const c of categories) await ctx.db.delete(c._id);
    const profiles = await ctx.db.query("franchiseProfiles").collect();
    for (const p of profiles) await ctx.db.delete(p._id);
    return { message: "Cleared all data. Run seedBrands to re-seed." };
  },
});

// Seed test CRM leads across brands
export const seedTestLeads = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("crmLeads").collect();
    if (existing.length > 0) {
      return { message: "Leads already exist", count: existing.length };
    }

    const brands = await ctx.db.query("brands").collect();
    if (brands.length === 0) return { message: "No brands — seed brands first" };

    // Pick up to 5 brands for test leads
    const targetBrands = brands.slice(0, 5);
    const now = Date.now();
    const stages = ["new_lead", "intro_call", "qualified", "discovery_day", "pending_contract", "awarded", "lost"] as const;
    const sources = ["manual", "website", "referral", "meta_ads", "google_ads"];

    const testLeads = [
      { firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@example.com", phone: "(555) 234-5678", address: "Austin, TX", liquidCapital: "$100K–$250K", mainTerritory: "Austin, TX", stage: "qualified", source: "website", notes: "Very interested, has restaurant management experience" },
      { firstName: "James", lastName: "Rodriguez", email: "james.r@example.com", phone: "(555) 345-6789", address: "Tampa, FL", liquidCapital: "$250K–$500K", mainTerritory: "Tampa, FL", secondTerritory: "Orlando, FL", stage: "discovery_day", source: "referral", notes: "Referred by existing franchisee. Multi-unit operator." },
      { firstName: "Emily", lastName: "Chen", email: "emily.chen@example.com", phone: "(555) 456-7890", address: "San Diego, CA", liquidCapital: "$50K–$100K", mainTerritory: "San Diego, CA", stage: "new_lead", source: "meta_ads" },
      { firstName: "Marcus", lastName: "Johnson", email: "marcus.j@example.com", phone: "(555) 567-8901", address: "Atlanta, GA", liquidCapital: "$500K–$1M", mainTerritory: "Atlanta, GA", secondTerritory: "Nashville, TN", thirdTerritory: "Charlotte, NC", numTerritories: 3, stage: "pending_contract", source: "google_ads", notes: "Multi-unit deal. Attorney reviewing FDD." },
      { firstName: "Rachel", lastName: "Kim", email: "rachel.kim@example.com", phone: "(555) 678-9012", address: "Denver, CO", liquidCapital: "$100K–$250K", mainTerritory: "Denver, CO", stage: "intro_call", source: "website" },
      { firstName: "David", lastName: "Patel", email: "david.p@example.com", phone: "(555) 789-0123", address: "Phoenix, AZ", liquidCapital: "$250K–$500K", mainTerritory: "Phoenix, AZ", stage: "awarded", source: "referral", notes: "Signed! Opening Q3." },
      { firstName: "Amanda", lastName: "Torres", email: "amanda.t@example.com", phone: "(555) 890-1234", address: "Miami, FL", liquidCapital: "$100K–$250K", mainTerritory: "Miami, FL", stage: "lost", source: "manual", notes: "Decided on different concept" },
      { firstName: "Chris", lastName: "Williams", email: "chris.w@example.com", phone: "(555) 901-2345", address: "Dallas, TX", liquidCapital: "$50K–$100K", mainTerritory: "Dallas, TX", stage: "new_lead", source: "meta_ads" },
      { firstName: "Jessica", lastName: "Park", email: "jessica.p@example.com", phone: "(555) 012-3456", address: "Seattle, WA", liquidCapital: "$250K–$500K", mainTerritory: "Seattle, WA", secondTerritory: "Portland, OR", stage: "qualified", source: "website", notes: "Strong background in multi-unit management" },
      { firstName: "Michael", lastName: "Brown", email: "michael.b@example.com", phone: "(555) 123-4567", address: "Chicago, IL", liquidCapital: "$500K–$1M", mainTerritory: "Chicago, IL", numTerritories: 2, stage: "intro_call", source: "google_ads" },
      { firstName: "Lisa", lastName: "Nguyen", email: "lisa.n@example.com", phone: "(555) 234-5679", address: "Houston, TX", liquidCapital: "$100K–$250K", mainTerritory: "Houston, TX", stage: "discovery_day", source: "referral" },
      { firstName: "Tyler", lastName: "Scott", email: "tyler.s@example.com", phone: "(555) 345-6780", address: "Las Vegas, NV", liquidCapital: "$50K–$100K", mainTerritory: "Las Vegas, NV", stage: "new_lead", source: "website" },
    ];

    let count = 0;
    for (let i = 0; i < testLeads.length; i++) {
      const brand = targetBrands[i % targetBrands.length];
      const lead = testLeads[i];
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const createdAt = now - daysAgo * 86400000;
      await ctx.db.insert("crmLeads", {
        brandId: brand._id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        liquidCapital: lead.liquidCapital,
        mainTerritory: lead.mainTerritory,
        secondTerritory: (lead as any).secondTerritory,
        thirdTerritory: (lead as any).thirdTerritory,
        numTerritories: (lead as any).numTerritories,
        stage: lead.stage as any,
        source: lead.source,
        notes: lead.notes,
        createdAt,
        updatedAt: createdAt,
      });
      count++;
    }
    return { message: `Seeded ${count} test leads across ${targetBrands.length} brands` };
  },
});

// One-time: activate all claimed brands so they show in search/explore
export const activateAllBrands = mutation({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").collect();
    let activated = 0;
    for (const brand of brands) {
      if (brand.isActive !== true) {
        await ctx.db.patch(brand._id, { isActive: true });
        activated++;
      }
    }
    return { message: `Activated ${activated} brands`, total: brands.length };
  },
});
