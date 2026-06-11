import { query, action } from "./_generated/server";
import { v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };

export const checkEnv = query({
  args: {},
  handler: async () => {
    const apiUrl = process.env.VIKTOR_SPACES_API_URL;
    const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;
    
    return {
      hasApiUrl: !!apiUrl,
      apiUrl: apiUrl ? apiUrl.substring(0, 30) + "..." : "NOT SET",
      hasProjectName: !!projectName,
      projectName: projectName || "NOT SET",
      hasProjectSecret: !!projectSecret,
      secretPreview: projectSecret 
        ? projectSecret.substring(0, 4) + "..." + projectSecret.substring(projectSecret.length - 4)
        : "NOT SET",
      secretLength: projectSecret?.length || 0,
    };
  },
});

export const testEmail = action({
  args: { email: v.string() },
  handler: async (_ctx, { email }) => {
    const apiUrl = process.env.VIKTOR_SPACES_API_URL;
    const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!apiUrl || !projectName || !projectSecret) {
      return { success: false, error: "Missing env vars", details: { hasApiUrl: !!apiUrl, hasProjectName: !!projectName, hasProjectSecret: !!projectSecret } };
    }

    try {
      const response = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          project_secret: projectSecret,
          to_email: email,
          subject: "MapKi Test - Email Delivery Check",
          html_content: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px"><h2>Email Delivery Test</h2><p>If you see this, MapKi email delivery is working!</p><div style="background:#f5f5f5;padding:20px;text-align:center;border-radius:8px;margin:20px 0"><span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#333">123456</span></div><p style="color:#999;font-size:12px">This is a test email from MapKi.</p></div>`,
          text_content: "Email delivery test - code: 123456",
          email_type: "otp",
        }),
      });

      const responseText = await response.text();
      let responseJson;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

      return {
        success: response.ok,
        status: response.status,
        responseText: responseText.substring(0, 500),
        responseJson,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});
