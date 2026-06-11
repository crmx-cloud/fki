import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Bulk import franchises from a curated dataset.
 * Creates brands + franchise profiles, skipping any that already exist.
 */

interface FranchiseEntry {
  name: string;
  slug: string;
  category: string;
  description: string;
  website?: string;
  yearFounded?: number;
  yearFranchising?: number;
  totalUnits?: number;
  investmentMin?: number;
  investmentMax?: number;
  franchiseFee?: number;
  royaltyPercent?: number;
  liquidCapitalMin?: number;
  f500Rank?: number;
  rankingYear?: number;
  hqCity?: string;
  hqState?: string;
  ownerTypes?: string[];
  isGrowing?: boolean;
  item19Available?: boolean;
  sbaApproved?: boolean;
  veteranDiscount?: boolean;
  multiUnitAvailable?: boolean;
}

// ── Curated Franchise 500 Dataset (Top 50) ──
const FRANCHISE_DATA: FranchiseEntry[] = [
  { name: "McDonald's", slug: "mcdonalds", category: "Food & Beverage", description: "The world's leading global foodservice retailer with over 40,000 locations in over 100 countries.", website: "https://mcdonalds.com", yearFounded: 1955, yearFranchising: 1955, totalUnits: 40275, investmentMin: 1314500, investmentMax: 2306500, franchiseFee: 45000, royaltyPercent: 4, liquidCapitalMin: 500000, f500Rank: 1, rankingYear: 2026, hqCity: "Chicago", hqState: "IL", ownerTypes: ["owner_operator"], isGrowing: true, item19Available: true, sbaApproved: true, veteranDiscount: false, multiUnitAvailable: true },
  { name: "Chick-fil-A", slug: "chick-fil-a", category: "Food & Beverage", description: "America's favorite chicken restaurant known for exceptional customer service and quality food.", website: "https://chick-fil-a.com", yearFounded: 1967, yearFranchising: 1967, totalUnits: 3059, investmentMin: 510950, investmentMax: 2431500, franchiseFee: 10000, royaltyPercent: 15, liquidCapitalMin: 75000, f500Rank: 2, rankingYear: 2026, hqCity: "Atlanta", hqState: "GA", ownerTypes: ["owner_operator"], isGrowing: true, item19Available: true },
  { name: "Taco Bell", slug: "taco-bell", category: "Food & Beverage", description: "Leading Mexican-inspired quick-service restaurant brand serving innovative menu items.", website: "https://tacobell.com", yearFounded: 1962, yearFranchising: 1964, totalUnits: 8587, investmentMin: 575600, investmentMax: 3370100, franchiseFee: 25000, royaltyPercent: 5.5, liquidCapitalMin: 750000, f500Rank: 3, rankingYear: 2026, hqCity: "Irvine", hqState: "CA", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Popeyes Louisiana Kitchen", slug: "popeyes", category: "Food & Beverage", description: "Iconic fried chicken restaurant inspired by New Orleans flavors and Southern cooking.", website: "https://popeyes.com", yearFounded: 1972, yearFranchising: 1976, totalUnits: 3980, investmentMin: 383500, investmentMax: 2612800, franchiseFee: 50000, royaltyPercent: 5, liquidCapitalMin: 500000, f500Rank: 4, rankingYear: 2026, hqCity: "Miami", hqState: "FL", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "The UPS Store", slug: "ups-store", category: "Services", description: "The nation's largest franchisor of retail shipping, postal, printing and business service centers.", website: "https://theupsstore.com", yearFounded: 1980, yearFranchising: 1980, totalUnits: 5724, investmentMin: 177955, investmentMax: 477325, franchiseFee: 29950, royaltyPercent: 5, liquidCapitalMin: 100000, f500Rank: 5, rankingYear: 2026, hqCity: "San Diego", hqState: "CA", ownerTypes: ["owner_operator"], isGrowing: true, sbaApproved: true, veteranDiscount: true },
  { name: "Jersey Mike's Subs", slug: "jersey-mikes", category: "Food & Beverage", description: "Fast-casual sub sandwich franchise known for fresh-sliced, authentic East Coast-style subs.", website: "https://jerseymikes.com", yearFounded: 1956, yearFranchising: 1987, totalUnits: 2800, investmentMin: 226740, investmentMax: 822685, franchiseFee: 18500, royaltyPercent: 6.5, liquidCapitalMin: 100000, f500Rank: 6, rankingYear: 2026, hqCity: "Manasquan", hqState: "NJ", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, item19Available: true },
  { name: "Kumon Math & Reading Centers", slug: "kumon", category: "Education & Children", description: "World's largest after-school math and reading program for children of all ages.", website: "https://kumon.com", yearFounded: 1958, yearFranchising: 1958, totalUnits: 26566, investmentMin: 67248, investmentMax: 147530, franchiseFee: 1000, royaltyPercent: 0, liquidCapitalMin: 70000, f500Rank: 7, rankingYear: 2026, hqCity: "Teaneck", hqState: "NJ", ownerTypes: ["owner_operator"], isGrowing: true },
  { name: "Dunkin'", slug: "dunkin", category: "Food & Beverage", description: "America's favorite all-day, everyday stop for coffee, espresso, breakfast sandwiches and donuts.", website: "https://dunkindonuts.com", yearFounded: 1950, yearFranchising: 1955, totalUnits: 13742, investmentMin: 526900, investmentMax: 1809500, franchiseFee: 40000, royaltyPercent: 5.9, liquidCapitalMin: 250000, f500Rank: 8, rankingYear: 2026, hqCity: "Canton", hqState: "MA", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, item19Available: true, multiUnitAvailable: true },
  { name: "Culver's", slug: "culvers", category: "Food & Beverage", description: "Family-favorite restaurant known for ButterBurgers, Fresh Frozen Custard, and Wisconsin hospitality.", website: "https://culvers.com", yearFounded: 1984, yearFranchising: 1988, totalUnits: 994, investmentMin: 2690000, investmentMax: 6390000, franchiseFee: 55000, royaltyPercent: 4, liquidCapitalMin: 500000, f500Rank: 9, rankingYear: 2026, hqCity: "Prairie du Sac", hqState: "WI", ownerTypes: ["owner_operator"], isGrowing: true, item19Available: true },
  { name: "7-Eleven", slug: "7-eleven", category: "Retail", description: "The world's largest convenience store chain with 24/7 accessibility and diverse product offerings.", website: "https://7-eleven.com", yearFounded: 1927, yearFranchising: 1964, totalUnits: 13000, investmentMin: 59000, investmentMax: 1840000, franchiseFee: 25000, royaltyPercent: 0, liquidCapitalMin: 50000, f500Rank: 10, rankingYear: 2026, hqCity: "Irving", hqState: "TX", ownerTypes: ["owner_operator"], isGrowing: true },
  { name: "Great Clips", slug: "great-clips", category: "Beauty & Self Care", description: "World's largest salon brand offering no-appointment, affordable haircuts.", website: "https://greatclips.com", yearFounded: 1982, yearFranchising: 1983, totalUnits: 4546, investmentMin: 187470, investmentMax: 381500, franchiseFee: 20000, royaltyPercent: 6, liquidCapitalMin: 250000, f500Rank: 11, rankingYear: 2026, hqCity: "Minneapolis", hqState: "MN", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true, veteranDiscount: true },
  { name: "Planet Fitness", slug: "planet-fitness", category: "Fitness", description: "High-value, low-price fitness center known for its Judgement Free Zone philosophy.", website: "https://planetfitness.com", yearFounded: 1992, yearFranchising: 2003, totalUnits: 2600, investmentMin: 1200000, investmentMax: 4900000, franchiseFee: 20000, royaltyPercent: 7, liquidCapitalMin: 1500000, f500Rank: 12, rankingYear: 2026, hqCity: "Hampton", hqState: "NH", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Sport Clips", slug: "sport-clips", category: "Beauty & Self Care", description: "A sports-themed hair salon franchise that specializes in men's and boys' haircuts.", website: "https://sportclips.com", yearFounded: 1993, yearFranchising: 1995, totalUnits: 1900, investmentMin: 266300, investmentMax: 439500, franchiseFee: 25000, royaltyPercent: 6, liquidCapitalMin: 200000, f500Rank: 13, rankingYear: 2026, hqCity: "Georgetown", hqState: "TX", ownerTypes: ["semi_absentee"], isGrowing: true, veteranDiscount: true },
  { name: "Tropical Smoothie Cafe", slug: "tropical-smoothie", category: "Food & Beverage", description: "Fast-casual cafe franchise serving smoothies, wraps, sandwiches, and flatbreads.", website: "https://tropicalsmoothiecafe.com", yearFounded: 1997, yearFranchising: 1997, totalUnits: 1400, investmentMin: 320500, investmentMax: 658000, franchiseFee: 30000, royaltyPercent: 6, liquidCapitalMin: 125000, f500Rank: 14, rankingYear: 2026, hqCity: "Atlanta", hqState: "GA", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Wingstop", slug: "wingstop", category: "Food & Beverage", description: "The wing experts specializing in cooked-to-order chicken wings with bold flavors.", website: "https://wingstop.com", yearFounded: 1994, yearFranchising: 1997, totalUnits: 2200, investmentMin: 390200, investmentMax: 917400, franchiseFee: 20000, royaltyPercent: 6, liquidCapitalMin: 300000, f500Rank: 15, rankingYear: 2026, hqCity: "Dallas", hqState: "TX", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, item19Available: true, multiUnitAvailable: true },
  { name: "Orangetheory Fitness", slug: "orangetheory", category: "Fitness", description: "Science-backed, technology-tracked, coach-inspired group workout fitness studio.", website: "https://orangetheory.com", yearFounded: 2010, yearFranchising: 2010, totalUnits: 1600, investmentMin: 684430, investmentMax: 1583260, franchiseFee: 59950, royaltyPercent: 8, liquidCapitalMin: 300000, f500Rank: 16, rankingYear: 2026, hqCity: "Boca Raton", hqState: "FL", ownerTypes: ["semi_absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "SERVPRO", slug: "servpro", category: "Home Services", description: "Leading fire, water, and mold damage restoration franchise serving residential and commercial customers.", website: "https://servpro.com", yearFounded: 1967, yearFranchising: 1969, totalUnits: 2200, investmentMin: 217525, investmentMax: 566505, franchiseFee: 50000, royaltyPercent: 0, liquidCapitalMin: 175000, f500Rank: 17, rankingYear: 2026, hqCity: "Gallatin", hqState: "TN", ownerTypes: ["owner_operator"], isGrowing: true, veteranDiscount: true },
  { name: "Ace Hardware", slug: "ace-hardware", category: "Retail", description: "The world's largest hardware cooperative with locally owned stores providing expert advice.", website: "https://acehardware.com", yearFounded: 1924, yearFranchising: 1976, totalUnits: 5800, investmentMin: 300000, investmentMax: 2080000, franchiseFee: 5000, royaltyPercent: 0, liquidCapitalMin: 400000, f500Rank: 18, rankingYear: 2026, hqCity: "Oak Brook", hqState: "IL", ownerTypes: ["owner_operator"], isGrowing: true },
  { name: "Nothing Bundt Cakes", slug: "nothing-bundt-cakes", category: "Food & Beverage", description: "Specialty bakery franchise offering handcrafted bundt cakes for every occasion.", website: "https://nothingbundtcakes.com", yearFounded: 1997, yearFranchising: 2006, totalUnits: 600, investmentMin: 456800, investmentMax: 787500, franchiseFee: 35000, royaltyPercent: 5, liquidCapitalMin: 150000, f500Rank: 19, rankingYear: 2026, hqCity: "Dallas", hqState: "TX", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true },
  { name: "HomeVestors of America", slug: "homevestors", category: "Services", description: "America's #1 home buyer franchise, helping homeowners sell quickly with the We Buy Ugly Houses brand.", website: "https://homevestors.com", yearFounded: 1996, yearFranchising: 1996, totalUnits: 1100, investmentMin: 93000, investmentMax: 431750, franchiseFee: 39000, royaltyPercent: 0, liquidCapitalMin: 70000, f500Rank: 20, rankingYear: 2026, hqCity: "Dallas", hqState: "TX", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, veteranDiscount: true },
  { name: "Massage Envy", slug: "massage-envy", category: "Health & Wellness", description: "Leading massage and skincare franchise with an affordable membership model.", website: "https://massageenvy.com", yearFounded: 2002, yearFranchising: 2003, totalUnits: 1150, investmentMin: 527506, investmentMax: 1084049, franchiseFee: 45000, royaltyPercent: 6, liquidCapitalMin: 250000, f500Rank: 21, rankingYear: 2026, hqCity: "Scottsdale", hqState: "AZ", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "European Wax Center", slug: "european-wax-center", category: "Beauty & Self Care", description: "Premier body waxing franchise offering a full suite of waxing services in a comfortable environment.", website: "https://waxcenter.com", yearFounded: 2004, yearFranchising: 2006, totalUnits: 1000, investmentMin: 497275, investmentMax: 768505, franchiseFee: 45000, royaltyPercent: 6, liquidCapitalMin: 400000, f500Rank: 22, rankingYear: 2026, hqCity: "Plano", hqState: "TX", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Anytime Fitness", slug: "anytime-fitness", category: "Fitness", description: "24-hour fitness club franchise that prides itself on providing convenient, affordable fitness.", website: "https://anytimefitness.com", yearFounded: 2002, yearFranchising: 2002, totalUnits: 5200, investmentMin: 117025, investmentMax: 657160, franchiseFee: 42500, royaltyPercent: 0, liquidCapitalMin: 120000, f500Rank: 23, rankingYear: 2026, hqCity: "Woodbury", hqState: "MN", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true, veteranDiscount: true },
  { name: "Mathnasium", slug: "mathnasium", category: "Education & Children", description: "The Math Learning Center — specialized math tutoring for children with a proven method.", website: "https://mathnasium.com", yearFounded: 2002, yearFranchising: 2003, totalUnits: 1100, investmentMin: 124650, investmentMax: 176800, franchiseFee: 49000, royaltyPercent: 0, liquidCapitalMin: 100000, f500Rank: 24, rankingYear: 2026, hqCity: "Los Angeles", hqState: "CA", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true },
  { name: "Crumbl Cookies", slug: "crumbl-cookies", category: "Food & Beverage", description: "Fast-growing gourmet cookie franchise with rotating weekly flavors and viral social media presence.", website: "https://crumblcookies.com", yearFounded: 2017, yearFranchising: 2018, totalUnits: 1000, investmentMin: 561725, investmentMax: 1064525, franchiseFee: 50000, royaltyPercent: 8, liquidCapitalMin: 250000, f500Rank: 25, rankingYear: 2026, hqCity: "Lindon", hqState: "UT", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, item19Available: true, multiUnitAvailable: true },
  { name: "Painting with a Twist", slug: "painting-with-a-twist", category: "Services", description: "Paint-and-sip franchise offering art classes, private parties, and team building events.", website: "https://paintingwithatwist.com", yearFounded: 2007, yearFranchising: 2009, totalUnits: 300, investmentMin: 98400, investmentMax: 226500, franchiseFee: 25000, royaltyPercent: 6, liquidCapitalMin: 80000, f500Rank: 35, rankingYear: 2026, hqCity: "Mandeville", hqState: "LA", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true },
  { name: "The Cleaning Authority", slug: "cleaning-authority", category: "Home Services", description: "Professional residential cleaning franchise with a focus on green cleaning and customer satisfaction.", website: "https://thecleaningauthority.com", yearFounded: 1978, yearFranchising: 1996, totalUnits: 250, investmentMin: 90125, investmentMax: 175900, franchiseFee: 25000, royaltyPercent: 0, liquidCapitalMin: 75000, f500Rank: 40, rankingYear: 2026, hqCity: "Columbia", hqState: "MD", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, veteranDiscount: true },
  { name: "Hand & Stone Massage and Facial Spa", slug: "hand-and-stone", category: "Health & Wellness", description: "Affordable luxury massage and facial spa franchise with a membership-based business model.", website: "https://handandstone.com", yearFounded: 2004, yearFranchising: 2006, totalUnits: 600, investmentMin: 559455, investmentMax: 791800, franchiseFee: 45000, royaltyPercent: 5, liquidCapitalMin: 250000, f500Rank: 42, rankingYear: 2026, hqCity: "Trevose", hqState: "PA", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Two Maids & A Mop", slug: "two-maids", category: "Home Services", description: "Home cleaning franchise known for its unique pay-for-performance model linking cleaner pay to customer reviews.", website: "https://twomaidsfranchise.com", yearFounded: 2003, yearFranchising: 2013, totalUnits: 150, investmentMin: 87700, investmentMax: 169600, franchiseFee: 40000, royaltyPercent: 0, liquidCapitalMin: 75000, f500Rank: 55, rankingYear: 2026, hqCity: "Birmingham", hqState: "AL", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, veteranDiscount: true },
  { name: "Goldfish Swim School", slug: "goldfish-swim-school", category: "Education & Children", description: "Premier learn-to-swim franchise with tropical-themed, state-of-the-art facilities for children.", website: "https://goldfishswimschool.com", yearFounded: 2006, yearFranchising: 2009, totalUnits: 175, investmentMin: 2038425, investmentMax: 4854500, franchiseFee: 50000, royaltyPercent: 6, liquidCapitalMin: 500000, f500Rank: 60, rankingYear: 2026, hqCity: "Troy", hqState: "MI", ownerTypes: ["semi_absentee", "absentee"], isGrowing: true, multiUnitAvailable: true },
  { name: "Burn Boot Camp", slug: "burn-boot-camp", category: "Fitness", description: "Challenging group fitness franchise with a focus on community, empowerment, and total body transformation.", website: "https://burnbootcamp.com", yearFounded: 2012, yearFranchising: 2015, totalUnits: 350, investmentMin: 252200, investmentMax: 628200, franchiseFee: 50000, royaltyPercent: 6, liquidCapitalMin: 200000, f500Rank: 70, rankingYear: 2026, hqCity: "Huntersville", hqState: "NC", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true },
  { name: "Neighborly (Mr. Rooter)", slug: "mr-rooter", category: "Home Services", description: "Full-service plumbing franchise backed by Neighborly, the world's largest home services company.", website: "https://mrrooter.com", yearFounded: 1970, yearFranchising: 1972, totalUnits: 300, investmentMin: 77850, investmentMax: 187800, franchiseFee: 35000, royaltyPercent: 7, liquidCapitalMin: 100000, f500Rank: 75, rankingYear: 2026, hqCity: "Waco", hqState: "TX", ownerTypes: ["owner_operator"], isGrowing: true },
  { name: "Big Frog Custom T-Shirts", slug: "big-frog", category: "Retail", description: "Custom t-shirt and apparel franchise offering fast, high-quality, on-demand garment printing.", website: "https://bigfrog.com", yearFounded: 2007, yearFranchising: 2008, totalUnits: 90, investmentMin: 172600, investmentMax: 329000, franchiseFee: 39500, royaltyPercent: 6, liquidCapitalMin: 100000, f500Rank: 200, rankingYear: 2026, hqCity: "Dunedin", hqState: "FL", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true },
  { name: "Image One Facility Solutions", slug: "image-one", category: "Services", description: "Commercial cleaning franchise with a focus on quality, technology, and customer satisfaction.", website: "https://imageoneclean.com", yearFounded: 2006, yearFranchising: 2011, totalUnits: 100, investmentMin: 44600, investmentMax: 177525, franchiseFee: 34000, royaltyPercent: 10, liquidCapitalMin: 40000, f500Rank: 250, rankingYear: 2026, hqCity: "Novi", hqState: "MI", ownerTypes: ["owner_operator", "semi_absentee"], isGrowing: true, veteranDiscount: true },
];

export const importFranchises = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check admin via userProfile role OR @franchiseki.com email
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const user = await ctx.db.get(userId);
    const isAdminByRole = profile?.role === "super_admin" || profile?.role === "admin";
    const isAdminByEmail = user?.email?.endsWith("@franchiseki.com");
    if (!isAdminByRole && !isAdminByEmail) {
      throw new Error("Admin access required");
    }

    // Get existing brand slugs to skip duplicates
    const existing = await ctx.db.query("brands").collect();
    const existingSlugs = new Set(existing.map((b) => b.slug));

    let imported = 0;
    let skipped = 0;

    for (const entry of FRANCHISE_DATA) {
      if (existingSlugs.has(entry.slug)) {
        skipped++;
        continue;
      }

      // Create brand
      const brandId = await ctx.db.insert("brands", {
        name: entry.name,
        slug: entry.slug,
        category: entry.category,
        description: entry.description,
        investmentMin: entry.investmentMin,
        investmentMax: entry.investmentMax,
        isActive: true,
      });

      // Create franchise profile
      await ctx.db.insert("franchiseProfiles", {
        brandId,
        yearFounded: entry.yearFounded,
        yearFranchising: entry.yearFranchising,
        totalUnits: entry.totalUnits,
        franchiseFee: entry.franchiseFee,
        royaltyPercent: entry.royaltyPercent,
        liquidCapitalMin: entry.liquidCapitalMin,
        totalInvestmentMin: entry.investmentMin,
        totalInvestmentMax: entry.investmentMax,
        ownerTypes: entry.ownerTypes,
        isGrowing: entry.isGrowing,
        item19Available: entry.item19Available,
        sbaApproved: entry.sbaApproved,
        veteranDiscount: entry.veteranDiscount,
        multiUnitAvailable: entry.multiUnitAvailable,
        corporateCity: entry.hqCity,
        corporateState: entry.hqState,
        franchiseRanking: entry.f500Rank,
        rankingYear: entry.rankingYear,
        rankingSource: "Entrepreneur Franchise 500",
        geographicFocus: "Nationwide",
      });

      imported++;
    }

    return {
      message: `Imported ${imported} franchises, skipped ${skipped} duplicates`,
      imported,
      skipped,
      total: FRANCHISE_DATA.length,
    };
  },
});

export const getImportStats = query({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").collect();
    const availableSlugs = FRANCHISE_DATA.map((d) => d.slug);
    const existingSlugs = new Set(brands.map((b) => b.slug));
    const importable = availableSlugs.filter((s) => !existingSlugs.has(s)).length;
    return {
      totalInDataset: FRANCHISE_DATA.length,
      alreadyImported: FRANCHISE_DATA.length - importable,
      readyToImport: importable,
      totalBrandsInDb: brands.length,
    };
  },
});

