import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    investmentMin: v.optional(v.number()),
    investmentMax: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    color: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isClaimed: v.optional(v.boolean()),
    claimedBy: v.optional(v.id("users")),
    franchiseeContactId: v.optional(v.id("contacts")),
    featured: v.optional(v.boolean()),
    registeredStates: v.optional(v.array(v.string())),
    // ── Provenance (admin brands view) ──
    // createdBy: "system" for pipeline/import-created brands (the default for
    // everything we generate); a franchisor flow could set otherwise later.
    // _creationTime (automatic) is the true original-created date — refreshes
    // never change it. updatedAt is stamped on every brand write/enrichment.
    createdBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  territories: defineTable({
    brandId: v.id("brands"),
    name: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("high_interest"),
      v.literal("pending_award"),
      v.literal("sold"),
      v.literal("open")
    ),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
  })
    .index("by_brand", ["brandId"])
    .index("by_status", ["status"])
    .index("by_brand_status", ["brandId", "status"]),

  // Per-brand, per-state availability — the REAL unit of franchise availability.
  // Franchisors open STATES, not pre-mapped city territories; city-level
  // availability is inquire-to-confirm. territories records now represent
  // existing locations ("open"), claimed ("sold"), or rare franchisor-confirmed
  // open territories ("available").
  stateAvailability: defineTable({
    brandId: v.id("brands"),
    state: v.string(), // 2-letter code, e.g. "TX"
    status: v.union(
      v.literal("open"), // actively selling franchises in this state
      v.literal("registered"), // FDD-registered but not a current focus
      v.literal("closed") // not available / not registered
    ),
    note: v.optional(v.string()),
    source: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  })
    .index("by_brand", ["brandId"])
    .index("by_brand_state", ["brandId", "state"])
    .index("by_state_status", ["state", "status"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  leads: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    territoryId: v.optional(v.id("territories")),
    source: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    quizResults: v.optional(v.any()),
  })
    .index("by_brand", ["brandId"])
    .index("by_email", ["email"]),

  savedItems: defineTable({
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    brandId: v.id("brands"),
    type: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_user_brand", ["userId", "brandId"]),

  alerts: defineTable({
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    type: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    territoryId: v.optional(v.id("territories")),
    isActive: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("standard"),
      v.literal("closer"),
      v.literal("setter"),
      v.literal("broker"),
      v.literal("brand_admin"),
      v.literal("franchisor"),
      v.literal("prospect")
    ),
    isActive: v.optional(v.boolean()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Contact verification (codes sent via CRMX/GHL — no Twilio/Resend)
    emailVerifiedAt: v.optional(v.number()),
    phoneVerifiedAt: v.optional(v.number()),
    // Brand-scoped access: brand_admin users see only these brands
    brandIds: v.optional(v.array(v.id("brands"))),
    // For area managers: IDs of users they manage
    managedUserIds: v.optional(v.array(v.id("users"))),
    // Granular permissions (for brand_admin / franchisor / closer / setter)
    permissions: v.optional(v.object({
      canEditTerritories: v.optional(v.boolean()),
      canManageBrand: v.optional(v.boolean()),
      canViewContacts: v.optional(v.boolean()),
      canExportData: v.optional(v.boolean()),
      canInviteUsers: v.optional(v.boolean()),
      // Visibility scope
      leadVisibility: v.optional(v.union(
        v.literal("own_only"),       // See only assigned leads
        v.literal("all"),            // See all leads
        v.literal("team")           // See own + managed users' leads
      )),
      canCreateContacts: v.optional(v.boolean()),
      canEditContacts: v.optional(v.boolean()),
      canDeleteContacts: v.optional(v.boolean()),
      canManageCustomFields: v.optional(v.boolean()),
    })),
  }).index("by_user", ["userId"]),

  franchiseProfiles: defineTable({
    brandId: v.id("brands"),

    // ── Data Provenance (accuracy guarantee) ──
    // Per-field source tracking: key = field name, value = where the data came from.
    // A field without a source entry is treated as UNVERIFIED by the UI and matcher.
    fieldSources: v.optional(
      v.record(
        v.string(),
        v.object({
          source: v.string(),
          url: v.optional(v.string()),
          year: v.optional(v.number()),
          confidence: v.optional(
            v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
          ),
        })
      )
    ),
    dataVerifiedAt: v.optional(v.string()),
    verifiedFieldCount: v.optional(v.number()),
    dataNotes: v.optional(v.string()),

    // ── Market-Research Risk Flags ──
    // Documented, SOURCED events (going-concern disclosures, franchisee litigation,
    // regulatory scrutiny) that computed metrics can't express. These feed the SWOT
    // Threats/Weaknesses — flags come from market research, never editorial opinion.
    // Brands can claim their listing to respond/update.
    riskFlags: v.optional(
      v.array(
        v.object({
          severity: v.union(v.literal("info"), v.literal("caution"), v.literal("red")),
          title: v.string(),
          detail: v.string(),
          source: v.string(),
          url: v.optional(v.string()),
          year: v.optional(v.number()),
        })
      )
    ),

    // ── Performance & Validation ──
    avgUnitRevenue: v.optional(v.number()),
    avgRevenueMin: v.optional(v.number()),
    avgRevenueMax: v.optional(v.number()),
    investmentReturnRatio: v.optional(v.number()),
    closureCount: v.optional(v.number()),
    totalUnits: v.optional(v.number()),
    yearFounded: v.optional(v.number()),
    yearFranchising: v.optional(v.number()),
    retentionRate: v.optional(v.string()),
    guestRating: v.optional(v.string()),

    // ── Investment Breakdown ──
    totalInvestmentMin: v.optional(v.number()),
    totalInvestmentMax: v.optional(v.number()),
    franchiseFee: v.optional(v.number()),
    royaltyPercent: v.optional(v.number()),
    brandFundPercent: v.optional(v.number()),
    marketingFees: v.optional(v.string()),
    minFootprint: v.optional(v.string()),

    // ── Brand Identity ──
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    logoStorageId: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),

    // ── Content ──
    brandStory: v.optional(v.string()),
    model: v.optional(v.string()),
    positioning: v.optional(v.string()),
    sellingPoints: v.optional(v.array(v.string())),
    idealPartner: v.optional(v.array(v.string())),
    faqs: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),

    // ── Flags ──
    fddAvailable: v.optional(v.boolean()),
    item19Available: v.optional(v.boolean()),
    isGrowing: v.optional(v.boolean()),
    sbaApproved: v.optional(v.boolean()),
    veteranDiscount: v.optional(v.boolean()),
    multiUnitAvailable: v.optional(v.boolean()),
    territoryExclusivity: v.optional(v.boolean()),
    trainingWeeks: v.optional(v.number()),

    // ── Owner & Capital Requirements ──
    ownerTypes: v.optional(v.array(v.string())),      // ["owner_operator","semi_absentee","absentee","investor"]
    liquidCapitalMin: v.optional(v.number()),          // minimum liquid capital required ($)

    // ── Step 3: Company Details (Profile Tab) ──
    parentCompany: v.optional(v.string()),
    leadershipName: v.optional(v.string()),
    leadershipTitle: v.optional(v.string()),
    corporateAddress: v.optional(v.string()),
    corporateCity: v.optional(v.string()),
    corporateState: v.optional(v.string()),
    corporateZip: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      facebook: v.optional(v.string()),
      twitter: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      instagram: v.optional(v.string()),
      youtube: v.optional(v.string()),
      tiktok: v.optional(v.string()),
    })),
    employeesAtHQ: v.optional(v.number()),
    geographicFocus: v.optional(v.string()),           // "Nationwide" | "Southeast US" etc.

    // ── Step 3: Media (Learn More Tab) ──
    overviewVideoUrl: v.optional(v.string()),          // YouTube/Vimeo embed URL
    testimonialVideoUrl: v.optional(v.string()),
    sectionImages: v.optional(v.object({               // Storage IDs for section-specific images
      brandStory: v.optional(v.string()),
      performance: v.optional(v.string()),
      idealPartner: v.optional(v.string()),
      whyChoose: v.optional(v.string()),
    })),

    // ── Step 3: Operations & Support ──
    classroomTrainingHours: v.optional(v.number()),
    onTheJobTrainingHours: v.optional(v.number()),
    ongoingSupport: v.optional(v.array(v.string())),   // ["Field support","Marketing","Technology"]
    marketingSupport: v.optional(v.array(v.string())),  // ["Co-op advertising","Social media","PR"]

    // ── Step 3: Additional Operations Flags ──
    absenteeOwnership: v.optional(v.boolean()),
    canRunFromHome: v.optional(v.boolean()),
    canRunPartTime: v.optional(v.boolean()),
    employeesRequired: v.optional(v.string()),          // "3-5" or "10-15" etc.
    exclusiveTerritories: v.optional(v.boolean()),
    termOfAgreement: v.optional(v.string()),            // "10 years" etc.
    termRenewable: v.optional(v.boolean()),
    veteranIncentiveDetails: v.optional(v.string()),    // e.g. "10% off franchise fee"

    // ── Step 3: Rankings / External ──
    franchiseRanking: v.optional(v.number()),           // Entrepreneur F500 rank
    rankingYear: v.optional(v.number()),
    rankingSource: v.optional(v.string()),              // "Entrepreneur Franchise 500"

    // ═══ FDD ENRICHMENT FIELDS ═══════════════════════════════════════════

    // ── Item 5/6: Fee Details ──
    royaltyNotes: v.optional(v.string()),               // e.g. "4% existing, 5% new franchises starting 2024"
    techFeeAnnual: v.optional(v.number()),              // Total estimated annual tech fees ($)
    techFeeDetails: v.optional(v.string()),             // Description of tech fee components
    otherRecurringFees: v.optional(v.string()),         // Other fees beyond royalty/ad/tech

    // ── Item 7: Startup Costs Breakdown ──
    item7Breakdown: v.optional(v.array(v.object({
      name: v.string(),
      low: v.number(),
      high: v.number(),
    }))),
    item7Average: v.optional(v.number()),               // (totalInvestmentMin + totalInvestmentMax) / 2

    // ── Item 19: Financial Performance ──
    item19Revenue: v.optional(v.object({
      average: v.optional(v.number()),                  // Average AUV ($)
      median: v.optional(v.number()),                   // Median AUV ($)
      high: v.optional(v.number()),                     // Highest AUV ($)
      low: v.optional(v.number()),                      // Lowest AUV ($)
    })),
    item19Profit: v.optional(v.object({
      estimatedAverage: v.optional(v.number()),         // Estimated operating income ($)
      estimatedMargin: v.optional(v.number()),          // Operating margin (%)
      notes: v.optional(v.string()),                    // What's excluded from profit calc
    })),

    // ── Item 20: Outlet Data ──
    item20: v.optional(v.object({
      reportingYear: v.optional(v.number()),
      franchisedUnitsStart: v.optional(v.number()),
      franchisedUnitsEnd: v.optional(v.number()),
      companyUnitsStart: v.optional(v.number()),
      companyUnitsEnd: v.optional(v.number()),
      transfers: v.optional(v.number()),
      newOpenings: v.optional(v.number()),
      closures: v.optional(v.number()),
      terminations: v.optional(v.number()),
      netGrowth: v.optional(v.number()),
      growthRate: v.optional(v.number()),               // YoY growth %
    })),

    // ── Item 3: Litigation ──
    activeLawsuits: v.optional(v.boolean()),
    activeLawsuitCount: v.optional(v.number()),
    activeLawsuitNotes: v.optional(v.string()),

    // ── Territory Details ──
    territorySize: v.optional(v.string()),              // e.g. "No exclusive territory" or "50,000 population"
    territoryPopulation: v.optional(v.number()),        // Min population if applicable

    // ── FDD Metadata ──
    fddYear: v.optional(v.number()),                    // Year of FDD data

    // ══ EXPANDED BRAND DATA (2026-06 acquisition-readiness audit) ════════
    // All optional + additive — see docs/KPI-DASHBOARD.md for the full
    // 80-point target model and which fields map to FDD items.
    // ── Business model ──
    subcategory: v.optional(v.string()),                // finer than brands.category
    businessModelType: v.optional(v.string()),          // "b2b" | "b2c" | "both"
    mobileBased: v.optional(v.boolean()),               // mobile/van-based vs fixed location
    internationalAvailability: v.optional(v.boolean()),
    franchiseDevContact: v.optional(v.string()),        // name/email of franchise development contact
    // ── Financial requirements ──
    netWorthMin: v.optional(v.number()),                // FDD Item 5/7 net-worth requirement
    financingOffered: v.optional(v.boolean()),          // franchisor offers direct financing
    thirdPartyFinancing: v.optional(v.string()),        // described 3rd-party financing relationships
    // ── Agreement terms (FDD Item 17) ──
    renewalTermYears: v.optional(v.number()),
    renewalFee: v.optional(v.number()),
    transferFee: v.optional(v.number()),
    exitRestrictions: v.optional(v.string()),
    nonCompeteTerms: v.optional(v.string()),
    // ── Obligations (FDD Item 8) ──
    supplierRestrictions: v.optional(v.string()),
    requiredPurchases: v.optional(v.string()),
    nationalAccounts: v.optional(v.boolean()),
    // ── Support detail ──
    grandOpeningSupport: v.optional(v.boolean()),
    callCenterSupport: v.optional(v.boolean()),
    siteSelectionSupport: v.optional(v.boolean()),
    realEstateSupport: v.optional(v.boolean()),
    rampUpNotes: v.optional(v.string()),                // typical ramp-up expectations (sourced)
    // ── Franchisor health (FDD Item 21 / Item 1) ──
    bankruptcyDisclosed: v.optional(v.boolean()),       // FDD Item 4
    franchisorFinancialsAvailable: v.optional(v.boolean()), // audited statements in FDD Item 21
    franchisorRevenue: v.optional(v.number()),
    franchisorNetIncome: v.optional(v.number()),
    // ── Market positioning ──
    customerAcquisitionModel: v.optional(v.string()),   // how units get customers
    primaryMarketingChannels: v.optional(v.array(v.string())),
    seasonalityNotes: v.optional(v.string()),
    regulatoryNotes: v.optional(v.string()),
    riskLevel: v.optional(v.string()),                  // "low" | "moderate" | "elevated" — derived from flags
  }).index("by_brand", ["brandId"]),

  prospectProfiles: defineTable({
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    contactId: v.optional(v.id("contacts")),
    // ── Contact Information ──
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    // ── Contact Audit ──
    contactLastEditedBy: v.optional(v.string()),   // "prospect" | "admin"
    contactLastEditedAt: v.optional(v.number()),   // timestamp
    adminVerified: v.optional(v.boolean()),         // true when admin saves contact
    adminVerifiedAt: v.optional(v.number()),        // when admin verified
    prospectModifiedAfterVerify: v.optional(v.boolean()), // flag for admin warning
    // ── Financial ──
    liquidCapital: v.optional(v.string()),
    // ── Owner Preference ──
    ownerType: v.optional(v.string()),
    // ── Franchise Preferences ──
    preferredCategories: v.optional(v.array(v.string())),
    // ── Primary Territory of Interest ──
    primaryCity: v.optional(v.string()),
    primaryState: v.optional(v.string()),
    primaryLat: v.optional(v.number()),
    primaryLng: v.optional(v.number()),
    primaryRadius: v.optional(v.number()),
    // ── Secondary Territory of Interest ──
    secondaryCity: v.optional(v.string()),
    secondaryState: v.optional(v.string()),
    secondaryLat: v.optional(v.number()),
    secondaryLng: v.optional(v.number()),
    secondaryRadius: v.optional(v.number()),
    // ── Additional Matching ──
    timeline: v.optional(v.string()),
    priorExperience: v.optional(v.string()),
    involvementLevel: v.optional(v.string()),
    // ── Legacy (kept for backward compat) ──
    primaryTerritory: v.optional(v.string()),
    budget: v.optional(v.string()),

    // ══ TIER 1 — HARD MATCH FIELDS ══════════════════════════════════════
    totalInvestmentBudget: v.optional(v.string()),     // "<100K", "100K-250K", "250K-500K", "500K-1M", "1M+"
    sbaFinancingIntent: v.optional(v.string()),        // "yes", "no", "maybe"
    ownershipModel: v.optional(v.array(v.string())),   // ["owner_operator","semi_absentee","absentee","investor"]
    runFromHome: v.optional(v.string()),               // "yes", "open", "no"
    fullTimePartTime: v.optional(v.string()),          // "full_time", "part_time", "start_part_transition"
    multiUnitInterest: v.optional(v.string()),         // "1", "2-3", "4-10", "10+"
    veteranStatus: v.optional(v.boolean()),
    revenueGoal: v.optional(v.string()),               // "<500K", "500K-1M", "1M-2M", "2M+"
    incomeGoal: v.optional(v.string()),                // "50K-100K", "100K-200K", "200K-500K", "500K+", "equity"

    // ══ TIER 2 — SOFT MATCH FIELDS ══════════════════════════════════════
    mustHaveFilters: v.optional(v.array(v.string())),  // ["item19","fdd","sba","exclusive_territory","veteran_discount","multi_unit"]
    brandMaturity: v.optional(v.string()),             // "emerging", "growth", "established", "no_preference"
    supportImportance: v.optional(v.string()),         // "critical", "important", "minimal"
    supportPriorities: v.optional(v.array(v.string())), // ["operations","marketing","technology","real_estate","hiring","financial"]
    employeeComfort: v.optional(v.string()),           // "solo", "small_1_5", "medium_5_15", "large_15_plus", "hire_manager", "no_preference"
    spacePreference: v.optional(v.string()),           // "home_mobile", "small_retail", "standard_retail", "large_format", "no_preference"

    // ══ TIER 3 — PSYCHOGRAPHIC FIELDS ═══════════════════════════════════
    motivations: v.optional(v.array(v.string())),      // top 2: ["financial_freedom","be_my_own_boss","legacy","passion","community","replace_income","lifestyle"]
    riskTolerance: v.optional(v.string()),             // "conservative", "moderate", "aggressive"
    professionalBackground: v.optional(v.array(v.string())), // top 2: ["sales","management","marketing","finance","healthcare","real_estate","technology","education","trades","hospitality","military","other"]
    lifestylePriorities: v.optional(v.array(v.string())), // top 2: ["flexibility","high_earning","community","health_wellness","creativity","predictable_routine"]
    avoidList: v.optional(v.array(v.string())),        // ["nights_weekends","heavy_buildout","large_teams","perishable_inventory","cold_calling"]

    // ── Profile Status ──
    profileComplete: v.optional(v.boolean()),
    enhancedProfileComplete: v.optional(v.boolean()),

    // ── TCPA/A2P consent (signup checkbox; timestamp = proof of consent) ──
    contactConsentAt: v.optional(v.number()),

    // ── Source Attribution (first/last touch, captured client-side) ──
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    referrer: v.optional(v.string()),
    landingPage: v.optional(v.string()),
    firstTouchAt: v.optional(v.number()),
    lastTouchAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"]),

  verificationCodes: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("email"), v.literal("phone")),
    codeHash: v.string(),
    target: v.string(),        // the email/phone the code was sent to
    expiresAt: v.number(),
    attempts: v.number(),
  }).index("by_user_kind", ["userId", "kind"]),

  brandClaims: defineTable({
    brandName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    brandId: v.optional(v.id("brands")),
  })
    .index("by_status", ["status"])
    .index("by_email", ["contactEmail"]),

  // Franchisor inquiries from the Brand Showcase landing page
  // (separate Vercel project, brandshowcase.franchiseki.com). Stored here so
  // the brand's platform profile can later be enriched/claimed from the inquiry.
  brandShowcaseInquiries: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    brandName: v.string(),
    role: v.string(),             // submitter's role/title at the brand
    category: v.string(),
    territories: v.string(),      // open/target territories, free text
    primaryInterest: v.string(),  // human-readable interest option from the form
    source: v.optional(v.string()),       // e.g. "brand-showcase"
    submittedAt: v.optional(v.string()),  // ISO timestamp from the relay
    brandId: v.optional(v.id("brands")),  // matched platform brand, if any
    createdAt: v.number(),
    // Contact verification (Brand Showcase onboarding) — per-channel OTP state,
    // mirrors verificationCodes semantics (hashed code, TTL, attempt cap)
    emailCodeHash: v.optional(v.string()),
    emailCodeExpiresAt: v.optional(v.number()),
    emailCodeAttempts: v.optional(v.number()),
    emailCodeSentAt: v.optional(v.number()),
    emailVerifiedAt: v.optional(v.number()),
    phoneCodeHash: v.optional(v.string()),
    phoneCodeExpiresAt: v.optional(v.number()),
    phoneCodeAttempts: v.optional(v.number()),
    phoneCodeSentAt: v.optional(v.number()),
    phoneVerifiedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_brand", ["brandId"]),

  invites: defineTable({
    email: v.string(),
    firstName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("standard"),
      v.literal("closer"),
      v.literal("setter"),
      v.literal("broker"),
      v.literal("brand_admin"),
      v.literal("franchisor"),
      v.literal("prospect")
    ),
    brandIds: v.optional(v.array(v.id("brands"))),
    permissions: v.optional(v.object({
      canEditTerritories: v.optional(v.boolean()),
      canManageBrand: v.optional(v.boolean()),
      canViewContacts: v.optional(v.boolean()),
      canExportData: v.optional(v.boolean()),
      canInviteUsers: v.optional(v.boolean()),
      leadVisibility: v.optional(v.union(
        v.literal("own_only"),
        v.literal("all"),
        v.literal("team")
      )),
      canCreateContacts: v.optional(v.boolean()),
      canEditContacts: v.optional(v.boolean()),
      canDeleteContacts: v.optional(v.boolean()),
      canManageCustomFields: v.optional(v.boolean()),
    })),
    invitedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  activityLog: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
  }),

  // ── CRM ──────────────────────────────────────────────────
  crmLeads: defineTable({
    brandId: v.id("brands"),
    contactId: v.optional(v.id("contacts")),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    liquidCapital: v.optional(v.string()),
    mainTerritory: v.optional(v.string()),
    secondTerritory: v.optional(v.string()),
    thirdTerritory: v.optional(v.string()),
    numTerritories: v.optional(v.number()),
    stage: v.union(
      v.literal("new_lead"),
      v.literal("intro_call"),
      v.literal("qualified"),
      v.literal("discovery_day"),
      v.literal("pending_contract"),
      v.literal("awarded"),
      v.literal("lost")
    ),
    source: v.optional(v.string()),       // "mapki" | "manual" | "import"
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),                // lowercase tag names
    deletedAt: v.optional(v.number()),                    // soft-delete timestamp
    deletedBy: v.optional(v.id("users")),                 // who deleted it
    interestedTerritories: v.optional(v.array(v.string())), // territory names/IDs
    // ── Associations ──
    salesRepId: v.optional(v.id("users")),                // assigned closer/sales rep
    setterId: v.optional(v.id("users")),                  // assigned setter
    interestedBrandIds: v.optional(v.array(v.id("brands"))), // brands they hearted or matched with
    territoryIds: v.optional(v.array(v.id("territories"))), // linked territory records
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_brand", ["brandId"])
    .index("by_brand_stage", ["brandId", "stage"])
    .index("by_created", ["createdAt"])
    .index("by_sales_rep", ["salesRepId"])
    .index("by_setter", ["setterId"]),

  contactTags: defineTable({
    name: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  appNotifications: defineTable({
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("new_brand"),
      v.literal("feature"),
      v.literal("offer"),
      v.literal("update")
    ),
    displayType: v.optional(v.union(
      v.literal("basic"),
      v.literal("top_bar"),
      v.literal("center_popup")
    )),
    audience: v.union(
      v.literal("all"),
      v.literal("leads"),
      v.literal("brands"),
    ),
    brandId: v.optional(v.id("brands")),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    // Scheduling
    scheduledAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    scheduleType: v.optional(v.union(v.literal("single"), v.literal("repeat"))),
    repeatFrequency: v.optional(v.union(
      v.literal("daily"), v.literal("weekly"), v.literal("monthly"),
      v.literal("quarterly"), v.literal("annually")
    )),
    repeatDays: v.optional(v.array(v.number())),
    repeatEndType: v.optional(v.union(
      v.literal("date"), v.literal("after_count"), v.literal("never")
    )),
    repeatEndDate: v.optional(v.number()),
    repeatEndCount: v.optional(v.number()),
    repeatCount: v.optional(v.number()),
    // Targeting
    targetBrandIds: v.optional(v.array(v.id("brands"))),
    targetLiquidCapital: v.optional(v.array(v.string())),
    targetStages: v.optional(v.array(v.string())),
    targetStates: v.optional(v.array(v.string())),
    targetTags: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  }).index("by_active", ["isActive"]).index("by_created", ["createdAt"]),

  notificationDismissals: defineTable({
    notificationId: v.id("appNotifications"),
    userId: v.id("users"),
    dismissedAt: v.number(),
    hearted: v.optional(v.boolean()),
  }).index("by_user", ["userId"]).index("by_user_notification", ["userId", "notificationId"]),

  brandNotifications: defineTable({
    brandId: v.id("brands"),
    emailsEnabled: v.boolean(),
    notifyEmails: v.array(v.string()),    // up to 5
    updatedBy: v.optional(v.id("users")),
  }).index("by_brand", ["brandId"]),

  // ── Contact Notes ────────────────────────────────────────
  contactNotes: defineTable({
    contactId: v.id("crmLeads"),
    content: v.string(),                    // plain text fallback
    richContent: v.optional(v.string()),    // HTML from rich editor
    color: v.optional(v.union(
      v.literal("yellow"),
      v.literal("blue"),
      v.literal("red"),
      v.literal("green"),
      v.literal("purple")
    )),
    isPinned: v.optional(v.boolean()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_contact_pinned", ["contactId", "isPinned"]),

  // ── Auto-Assignment Rules ────────────────────────────────
  autoAssignmentRules: defineTable({
    brandId: v.optional(v.id("brands")),    // optional: null = global rule
    mode: v.union(
      v.literal("equal"),                    // round-robin equally
      v.literal("custom_ratio")              // weighted distribution
    ),
    isActive: v.boolean(),
    // Users participating in auto-assignment
    assignees: v.array(v.object({
      userId: v.id("users"),
      ratio: v.optional(v.number()),         // for custom_ratio mode (e.g. 3 = 3 parts)
    })),
    // Role to assign as (sales_rep or setter)
    assignAs: v.union(v.literal("sales_rep"), v.literal("setter")),
    // Tracking: current position in rotation
    currentIndex: v.optional(v.number()),
    totalAssigned: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_brand", ["brandId"])
    .index("by_active", ["isActive"]),

  // ── Rep Assignment History ───────────────────────────────
  repAssignmentHistory: defineTable({
    leadId: v.id("crmLeads"),
    field: v.union(v.literal("salesRep"), v.literal("setter")),
    fromUserId: v.optional(v.id("users")),
    toUserId: v.optional(v.id("users")),
    changedBy: v.id("users"),
    changedAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_lead_field", ["leadId", "field"]),

  // ── Contacts (unified person record) ─────────────────────
  contacts: defineTable({
    type: v.union(
      v.literal("prospect"),
      v.literal("franchisee"),
      v.literal("both")
    ),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    // Link to auth user (if they have a login)
    userId: v.optional(v.id("users")),
    status: v.union(
      v.literal("active"),
      v.literal("deactivated")
    ),
    source: v.union(
      v.literal("signup"),
      v.literal("quiz"),
      v.literal("manual"),
      v.literal("import"),
      v.literal("claim"),
      v.literal("backfill")
    ),
    // Admin audit
    adminVerified: v.optional(v.boolean()),
    adminVerifiedAt: v.optional(v.number()),
    contactLastEditedBy: v.optional(v.string()),
    contactLastEditedAt: v.optional(v.number()),
    prospectModifiedAfterVerify: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // ── KPI / Acquisition-readiness dashboard (2026-06) ──────────────────
  // Manual marketing spend entries (admin-managed; ads-platform sync later)
  marketingSpend: defineTable({
    date: v.string(),                    // "YYYY-MM-DD" (day the spend applies to)
    source: v.string(),                  // matches attribution sources: "paid_ads", "social", ...
    campaign: v.optional(v.string()),
    amount: v.number(),                  // USD
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),

  // Revenue attributed back to a FranchiseKI profile (manually entered or
  // synced from GHL contacts later — triggerTag/pipelineStage configurable,
  // NOT hard-coded to one tag).
  revenueAttribution: defineTable({
    profileEmail: v.optional(v.string()),         // join key to prospectProfiles
    prospectProfileId: v.optional(v.id("prospectProfiles")),
    ghlContactId: v.optional(v.string()),
    ghlOpportunityId: v.optional(v.string()),     // dedupe key for GHL sync
    amount: v.number(),                           // USD
    revenueDate: v.string(),                      // "YYYY-MM-DD"
    source: v.optional(v.string()),
    campaign: v.optional(v.string()),
    pipelineStage: v.optional(v.string()),
    triggerTag: v.optional(v.string()),           // GHL tag/custom field that triggered attribution
    brandId: v.optional(v.id("brands")),
    consultantId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["revenueDate"])
    .index("by_email", ["profileEmail"]),

  // Newsletter signups (footer capture; pushed to CRMX with fki-newsletter tag)
  newsletterSubscribers: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ── User ↔ consultant chat (iMessage-style) ──────────────────────────
  // Thread key = the prospect's userId. The thread belongs to the USER —
  // it persists even if their consultant is unassigned/changed. Admins see
  // all threads; consultants see threads for their assigned leads only.
  chatMessages: defineTable({
    prospectUserId: v.id("users"),
    senderId: v.id("users"),
    senderRole: v.string(),            // "prospect" | "consultant" | "admin"
    senderName: v.optional(v.string()),
    body: v.string(),
    ts: v.number(),
    readByProspect: v.optional(v.boolean()),
    readByTeam: v.optional(v.boolean()),
    ghlMessageId: v.optional(v.string()),   // set when ingested from CRMX (dedupe key)
  }).index("by_prospect", ["prospectUserId", "ts"]),

  // Typing presence: one row per thread side, heartbeat-refreshed while the
  // sender types; the client treats typingUntil in the past as "stopped".
  chatTyping: defineTable({
    prospectUserId: v.id("users"),
    side: v.string(),                  // "prospect" | "team"
    typingUntil: v.number(),
  }).index("by_thread", ["prospectUserId", "side"]),

  // Intent/activity event stream — feeds "active profile" calculations and
  // future intent scoring. Server-side events logged via activity.logInternal,
  // client events via activity.track.
  activityEvents: defineTable({
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    eventType: v.string(),               // see EVENT_TYPES in convex/metricsDefs.ts
    ts: v.number(),
    brandId: v.optional(v.id("brands")),
    source: v.optional(v.string()),
    campaign: v.optional(v.string()),
    metadata: v.optional(v.string()),    // JSON blob
  })
    .index("by_user", ["userId"])
    .index("by_type", ["eventType"])
    .index("by_ts", ["ts"])
    .index("by_user_ts", ["userId", "ts"]),
});

export default schema;
