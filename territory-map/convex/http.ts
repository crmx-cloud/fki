import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { syncHttpHandler } from "./crmSync";
import { testEmailSend } from "./debugEmail";
import { inquiryHttpHandler, verifySendHandler, verifyConfirmHandler } from "./brandShowcase";
const http = httpRouter();
auth.addHttpRoutes(http);

// CRM sync endpoint - receives territory data from Viktor cron
http.route({
  path: "/api/crm-sync",
  method: "POST",
  handler: syncHttpHandler,
});

// Temporary: test email delivery from Convex backend
http.route({
  path: "/api/test-email",
  method: "POST",
  handler: testEmailSend,
});

// Brand Showcase franchisor inquiry intake — called by the showcase site's
// /api/submit Vercel relay (requires X-Showcase-Secret header)
http.route({
  path: "/api/brand-showcase-inquiry",
  method: "POST",
  handler: inquiryHttpHandler,
});

// Brand Showcase onboarding: contact verification (email + SMS codes),
// called by the showcase site's /api/verify relay (same secret header)
http.route({
  path: "/api/brand-showcase-verify/send",
  method: "POST",
  handler: verifySendHandler,
});
http.route({
  path: "/api/brand-showcase-verify/confirm",
  method: "POST",
  handler: verifyConfirmHandler,
});

export default http;
