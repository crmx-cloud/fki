import { httpAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

export const testEmailSend = httpAction(async (ctx, request) => {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

  if (!apiUrl || !projectName || !projectSecret) {
    return new Response(JSON.stringify({
      error: "Missing env vars",
      hasApiUrl: !!apiUrl,
      hasProjectName: !!projectName,
      hasProjectSecret: !!projectSecret
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  var emailUrl = apiUrl + "/api/viktor-spaces/send-email";

  try {
    var response = await fetch(emailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        project_secret: projectSecret,
        to_email: "brent@franchiseki.com",
        subject: "MapKi Test - Email Delivery Check",
        html_content: "<div style='font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px'><h2>Email Delivery Test</h2><p>If you see this, MapKi email is working!</p><div style='background:#f5f5f5;padding:20px;text-align:center;border-radius:8px;margin:20px 0'><span style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#333'>999999</span></div><p style='color:#999;font-size:12px'>Test from Viktor debugging OTP flow.</p></div>",
        text_content: "MapKi Email Test - code: 999999",
        email_type: "otp",
      }),
    });

    var responseText = await response.text();

    return new Response(JSON.stringify({
      status: response.status,
      ok: response.ok,
      body: responseText,
      secretPrefix: projectSecret.substring(0, 6),
      secretSuffix: projectSecret.substring(projectSecret.length - 6),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    var errMsg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
