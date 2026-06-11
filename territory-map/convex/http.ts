import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { syncHttpHandler } from "./crmSync";
import { testEmailSend } from "./debugEmail";
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

export default http;
