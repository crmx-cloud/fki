import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

/**
 * Privacy Policy + Terms of Use. AI-drafted for launch — flagged for
 * attorney review. Keep the SMS/A2P disclosures in Privacy §4 intact:
 * carriers require them for the CRMX SMS verification flow.
 */

const EFFECTIVE_DATE = "June 12, 2026";
const CONTACT_EMAIL = "info@franchiseki.com";
const CONTACT_PHONE = "(385) 475-5319";
const CONTACT_PHONE_TEL = "+13854755319";

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-extrabold mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-10">Effective date: {EFFECTIVE_DATE}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-slate-300 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-cyan-400">
          {children}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <section>
        <p>
          FranchiseKI ("we," "us," or "our") operates franchiseki.com, a free franchise discovery and
          due-diligence platform. This policy explains what we collect, how we use it, and the choices
          you have. The short version: we collect the information you give us to match you with
          franchise opportunities, we never sell your personal information, and you can delete your
          account at any time.
        </p>
      </section>
      <section>
        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Account &amp; contact information</strong> — name, email address, phone number, and mailing address when you create an account or profile.</li>
          <li><strong>Franchise preferences</strong> — the details you add to your PerfectFit profile, such as available capital, target territories, industry interests, timeline, ownership style, experience, and goals.</li>
          <li><strong>Usage activity</strong> — pages and brands you view, comparisons you run, reports you request, and similar product events tied to your account.</li>
          <li><strong>Attribution data</strong> — how you found us (for example a referral link, search engine, or campaign tag) and the page you landed on.</li>
        </ul>
      </section>
      <section>
        <h2>2. How We Use It</h2>
        <ul>
          <li>To generate your franchise matches, comparisons, and Due Diligence Dossier.</li>
          <li>To verify your email and phone (see Section 4) and secure your account.</li>
          <li>To connect you with a vetted franchise consultant or a franchisor — <strong>only when you request it</strong>.</li>
          <li>To send service messages and, with your consent, updates about your matches. You can opt out of non-essential email at any time.</li>
          <li>To understand aggregate usage and improve the platform. Aggregate metrics never identify you personally.</li>
        </ul>
      </section>
      <section>
        <h2>3. What We Share — and What We Don't</h2>
        <ul>
          <li><strong>We do not sell your personal information.</strong></li>
          <li>When you request an introduction to a brand or a consultant, we share the profile details relevant to that introduction (your contact info, capital range, territory, and preferences) with that consultant and/or franchisor.</li>
          <li>We use service providers to run the platform — hosting (Vercel), database (Convex), and customer communications (our CRM/messaging provider). They process data on our behalf under their own security obligations.</li>
          <li>We may disclose information if required by law or to protect the rights, safety, or property of FranchiseKI or others.</li>
        </ul>
      </section>
      <section>
        <h2>4. Text Messages (SMS) &amp; Email Verification</h2>
        <ul>
          <li>When you provide your phone number and request verification, we send a one-time code by SMS. Message frequency varies with your account activity; message and data rates may apply.</li>
          <li>Reply <strong>STOP</strong> to opt out of texts at any time, or <strong>HELP</strong> for help.</li>
          <li><strong>Your SMS opt-in and phone number are never shared with third parties for their own marketing.</strong></li>
          <li>Email verification works the same way with a one-time code sent to your inbox.</li>
        </ul>
      </section>
      <section>
        <h2>5. Cookies &amp; Local Storage</h2>
        <p>
          We use browser local storage for sign-in sessions, your preferences, and first-touch
          attribution (how you found us). We do not run third-party advertising trackers on the site.
        </p>
      </section>
      <section>
        <h2>6. Data Retention &amp; Your Rights</h2>
        <ul>
          <li>We keep your profile while your account is active so your matches and reports stay available.</li>
          <li>You can edit your profile at any time, and you can permanently delete your account from Settings → Delete account.</li>
          <li>You may also request access to, correction of, or deletion of your personal information by emailing us (below). We respond to verified requests consistent with applicable law, including state privacy laws.</li>
        </ul>
      </section>
      <section>
        <h2>7. Children</h2>
        <p>FranchiseKI is for adults evaluating business ownership. It is not directed to anyone under 18, and we do not knowingly collect information from minors.</p>
      </section>
      <section>
        <h2>8. Changes &amp; Contact</h2>
        <p>
          If we make material changes to this policy we will update the effective date above and, where
          appropriate, notify you. Questions or requests:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or call{" "}
          <a href={`tel:${CONTACT_PHONE_TEL}`}>{CONTACT_PHONE}</a>.
        </p>
        <p className="text-xs text-slate-500 mt-4">
          See also our <Link to="/terms">Terms of Use</Link>.
        </p>
      </section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <section>
        <p>
          These Terms of Use govern your use of franchiseki.com (the "Platform"), operated by
          FranchiseKI. By creating an account or using the Platform you agree to these terms. If you do
          not agree, please do not use the Platform.
        </p>
      </section>
      <section>
        <h2>1. What FranchiseKI Is (and Isn't)</h2>
        <ul>
          <li>The Platform is a free informational tool that helps you discover, research, and compare franchise opportunities, and — if you choose — connect with franchisors or vetted franchise consultants.</li>
          <li><strong>We are not a broker-dealer, financial advisor, accountant, or law firm.</strong> Nothing on the Platform is financial, legal, or investment advice, and no content constitutes an offer to sell a franchise.</li>
          <li>Franchise sales are governed by FTC and state franchise rules. Any offer is made only by the franchisor through its current Franchise Disclosure Document (FDD).</li>
        </ul>
      </section>
      <section>
        <h2>2. Data Accuracy</h2>
        <ul>
          <li>Brand data on the Platform is compiled from public sources — FDDs, franchisor disclosures, and franchise directories — and verified where possible, with per-field source citations.</li>
          <li>Despite our verification efforts, data can become outdated or contain errors. <strong>Always confirm every figure against the franchisor's current FDD and your own professional advisors before investing.</strong></li>
          <li>Match scores, risk flags, and reports are research aids generated from your stated preferences and available data — they are not recommendations or guarantees of business success.</li>
        </ul>
      </section>
      <section>
        <h2>3. Your Account</h2>
        <ul>
          <li>You must be at least 18 and provide accurate information. One account per person.</li>
          <li>You're responsible for safeguarding your password and for activity under your account.</li>
          <li>The Platform is free for franchise buyers. Consultants in our network are compensated by franchisors when a new franchisee is granted a territory — never by you.</li>
        </ul>
      </section>
      <section>
        <h2>4. Acceptable Use</h2>
        <ul>
          <li>No scraping, bulk-harvesting, reselling, or republishing Platform data without our written permission.</li>
          <li>No attempting to access other users' data, probing or disrupting the service, or using the Platform for unlawful purposes.</li>
          <li>We may suspend or terminate accounts that violate these terms.</li>
        </ul>
      </section>
      <section>
        <h2>5. Intellectual Property</h2>
        <p>
          The Platform, including its software, design, scoring methodology, and compiled datasets, is
          owned by FranchiseKI and protected by law. Brand names and logos belong to their respective
          owners and appear for identification only; their appearance does not imply endorsement.
        </p>
      </section>
      <section>
        <h2>6. Disclaimers &amp; Limitation of Liability</h2>
        <ul>
          <li>The Platform is provided "as is" and "as available," without warranties of any kind, express or implied.</li>
          <li>To the maximum extent permitted by law, FranchiseKI will not be liable for indirect, incidental, special, consequential, or punitive damages, or for any investment decision you make. Our total liability for any claim is limited to $100.</li>
          <li>Some jurisdictions don't allow certain limitations, so parts of this section may not apply to you.</li>
        </ul>
      </section>
      <section>
        <h2>7. General</h2>
        <ul>
          <li>These terms are governed by the laws of the State of Florida, without regard to conflict-of-law rules.</li>
          <li>We may update these terms; material changes will be reflected in the effective date above. Continued use after changes means you accept them.</li>
          <li>If any provision is unenforceable, the rest remains in effect.</li>
        </ul>
        <p className="mt-4">
          <strong>Contact us.</strong> FranchiseKI customer support:{" "}
          <a href={`tel:${CONTACT_PHONE_TEL}`}>{CONTACT_PHONE}</a> ·{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalShell>
  );
}
