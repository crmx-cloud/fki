import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  BarChart3,
  Globe,
  Code,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Star,
  Bell,
  Users,
  Sparkles,
  Mail,
  Target,
  Eye,
} from "lucide-react";

export function ForFranchisorsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white motion-page">
      <PublicNav />

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" /> For Franchise Brands
            </div>
          </Reveal>
          <Reveal as="h1" delay={80} className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Map Your Territories.{" "}
            <span className="text-cyan-400">Grow Your Brand.</span>
          </Reveal>
          <Reveal as="p" delay={180} className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Your franchise deserves more than a spreadsheet. Franchise KI gives you a
            stunning interactive map, a built-in CRM, AI-powered prospect
            matching, and lead notifications — all completely free.
          </Reveal>
          <Reveal delay={280} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/claim">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8">
                Build My Map <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/explore">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
                See Live Examples
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* What You Get — Feature Showcase with Screenshots */}
      <section className="py-20 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One Platform. Everything You Need.
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Franchise KI isn't just a map — it's the complete franchise growth toolkit.
            </p>
          </Reveal>

          {/* Feature 1 — Interactive Map */}
          <Reveal className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 text-cyan-400">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                Beautiful Interactive Territory Map
              </h3>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Color-coded dots show every territory at a glance — available,
                high-interest, pending, or sold. Prospects can see where you're
                growing and find open territories instantly.
              </p>
              <ul className="space-y-2">
                {[
                  "Auto-geocoded — just enter city & state",
                  "Embeddable on your own website via iframe",
                  "Mobile-responsive and fast",
                  "Pulsing animations on available territories",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Map mockup */}
              <div className="aspect-[16/10] rounded-xl bg-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                {/* Simulated territory dots */}
                <div className="relative w-full h-full">
                  {[
                    { x: "25%", y: "30%", color: "bg-[#e91e9a]", pulse: true },
                    { x: "45%", y: "45%", color: "bg-[#f59e0b]", pulse: false },
                    { x: "60%", y: "35%", color: "bg-[#22c55e]", pulse: true },
                    { x: "35%", y: "60%", color: "bg-[#ef4444]", pulse: false },
                    { x: "70%", y: "55%", color: "bg-[#e91e9a]", pulse: true },
                    { x: "20%", y: "50%", color: "bg-[#f97316]", pulse: false },
                    { x: "55%", y: "25%", color: "bg-[#22c55e]", pulse: true },
                    { x: "80%", y: "40%", color: "bg-[#e91e9a]", pulse: true },
                  ].map((dot, i) => (
                    <div
                      key={i}
                      className={`absolute w-3 h-3 rounded-full ${dot.color} ${dot.pulse ? "animate-pulse" : ""}`}
                      style={{ left: dot.x, top: dot.y }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-slate-500 text-sm font-medium bg-slate-800/80 px-3 py-1 rounded-lg">
                      Live Territory Map
                    </span>
                  </div>
                </div>
                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e91e9a]" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> High Interest</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> Pending</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Sold</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 2 — CRM */}
          <Reveal className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* CRM mockup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white">Lead Pipeline</span>
                  <span className="text-xs text-cyan-400 font-medium">12 active leads</span>
                </div>
                {[
                  { name: "Sarah M.", territory: "Austin, TX", stage: "Discovery Day", color: "bg-amber-500" },
                  { name: "James K.", territory: "Denver, CO", stage: "Intro Call", color: "bg-violet-500" },
                  { name: "Maria L.", territory: "Tampa, FL", stage: "New Lead", color: "bg-cyan-500" },
                  { name: "David R.", territory: "Phoenix, AZ", stage: "Qualified", color: "bg-blue-500" },
                ].map((lead, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                      {lead.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.territory}</div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-white ${lead.color}`}>
                      {lead.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                Built-In CRM & Lead Tracking
              </h3>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Every prospect who finds your brand on Franchise KI becomes a lead in
                your pipeline. Track them from first inquiry through discovery
                day to awarded — no spreadsheets needed.
              </p>
              <ul className="space-y-2">
                {[
                  "Kanban board & list view for your pipeline",
                  "Drag-and-drop leads between stages",
                  "Email notifications when new leads come in",
                  "Export to CSV or sync with your CRM",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Feature 3 — AI Matching */}
          <Reveal className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 text-violet-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                AI-Powered Prospect Matching
              </h3>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Prospects take a quick quiz and our AI instantly scores how well
                they match your franchise. Pre-qualified leads come to you — not
                tire-kickers.
              </p>
              <ul className="space-y-2">
                {[
                  "Prospects self-qualify before contacting you",
                  "Match score based on budget, timeline, and location",
                  "Higher quality leads, less wasted time",
                  "Prospects see which brands fit them best",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* AI Match mockup */}
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <span className="text-sm font-semibold text-white">AI Match Score</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-emerald-400">92</div>
                      <div className="text-[10px] text-slate-400 font-medium">MATCH SCORE</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {[
                    { label: "Budget Fit", pct: 95, color: "bg-emerald-500" },
                    { label: "Location Match", pct: 88, color: "bg-cyan-500" },
                    { label: "Experience", pct: 92, color: "bg-violet-500" },
                  ].map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{bar.label}</span>
                        <span>{bar.pct}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 4 — Notifications & Embed */}
          <Reveal className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Notification mockup */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Recent Notifications</span>
                </div>
                {[
                  { msg: "New lead: Sarah M. interested in Austin, TX", time: "2 min ago", icon: "🔔" },
                  { msg: "James K. submitted interest form for Denver", time: "1 hour ago", icon: "📩" },
                  { msg: "Lead Maria L. moved to Qualified stage", time: "3 hours ago", icon: "⬆️" },
                ].map((notif, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-lg">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{notif.msg}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{notif.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                Instant Lead Notifications
              </h3>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Never miss an opportunity. Get email alerts the moment someone
                expresses interest in a territory. Respond fast and close faster.
              </p>
              <ul className="space-y-2">
                {[
                  "Email alerts to up to 5 team members",
                  "Real-time notifications for new leads",
                  "Embed your map on your website — one line of code",
                  "Powered by Franchise KI, branded for your franchise",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal as="h2" className="text-3xl font-bold text-center mb-12">
            And That's Just the Start
          </Reveal>
          <Reveal stagger className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Code className="w-6 h-6" />,
                title: "Embeddable Map Widget",
                desc: "Drop your territory map onto your franchise website with a single iframe. Clean, isolated, branded.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Auto-Geocoding",
                desc: "Type a city and state — Franchise KI automatically pins it on the map. No manual coordinates needed.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Privacy Controls",
                desc: "Contact names and internal notes stay private. Public maps show territory status only.",
                color: "text-rose-400",
                bg: "bg-rose-500/10",
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: "Territory Status Tracking",
                desc: "Available, high interest, pending award, sold — update from desktop or mobile in one click.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: <Eye className="w-6 h-6" />,
                title: "Brand Profile Page",
                desc: "Your franchise gets a dedicated page on Franchise KI with your map, FDD info, and lead capture.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                icon: <Star className="w-6 h-6" />,
                title: "100% Free",
                desc: "No monthly fees. No per-territory charges. No credit card required. Franchise KI is free for franchise brands.",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
            ].map((feature, i) => (
              <div key={i} className="card-lift bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-3 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal as="h2" className="text-3xl font-bold text-center mb-12">Get Set Up in 3 Minutes</Reveal>
          <Reveal stagger className="space-y-8">
            {[
              {
                step: "1",
                title: "Tell Us About Your Brand",
                desc: "Enter your franchise name, category, and website. That's it — we handle the rest.",
              },
              {
                step: "2",
                title: "Add Your Territories",
                desc: "Type city and state for each territory. Set status: available, pending, or sold. Franchise KI auto-maps them.",
              },
              {
                step: "3",
                title: "Embed, Share & Start Getting Leads",
                desc: "Copy the embed code for your website, share the link with brokers, and watch the leads roll in.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <span className="text-cyan-400 font-bold text-lg">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-cyan-600/20 to-blue-600/10 border-t border-white/10">
        <Reveal className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Put Your Brand on the Map?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Beautiful maps. Built-in CRM. AI matching. Lead alerts. All free.
            <br />
            Join franchise brands already growing with Franchise KI.
          </p>
          <Link to="/claim">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white px-10">
              Build My Map <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  );
}
