/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Configuration, System Prompt & Seed Intelligence
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.CONFIG = {
  APP_NAME: "Argonaut",
  ENGINE: "Argus On-Device Intelligence",
  VERSION: "4.0.0",
  ENGINE_LABEL: "Argus AI",      // white-label name shown in UI
  /* The verdict engine runs entirely in the browser (js/model.js).
     There is no API, no key, and no per-scan cost — so analysis is
     unlimited. The daily counter is retained only for on-device
     usage telemetry; it never blocks a scan. */
  DAILY_QUOTA: Infinity,
  SIMHASH_THRESHOLD: 10,         // max hamming distance for near-duplicate text (edited copies ≈7, unrelated ≈26)
  IMGHASH_THRESHOLD: 10,         // max hamming distance for perceptual image match
  CONSENT_VERSION: 3,
  /* The website deliberately stores nothing off-device, so a
     correction made here can never reach us. The Telegram bot is the
     only channel that records 👍/👎 and turns them into training
     labels, so "Report Incorrect Result" sends people there. */
  BOT_URL: "https://t.me/ArgonautScamCheckBot",
};

/* ── Analysis logic lives on-device in js/model.js ──────────
   The fraud rubric that used to be an LLM system prompt is now
   implemented directly as the Argus ensemble model: entity
   extraction + six calibrated sub-detectors (financial fraud,
   data-harvest, engagement bait, compensation sanity, legitimacy,
   linguistic spam) pooled into a 0–100 trust score. No prompt,
   no provider, no network. See js/model.js for the full pipeline. */

/* ── Interview panic button — local heuristics ──────────── */
Argus.TRUSTED_MEET_DOMAINS = [
  "zoom.us","meet.google.com","teams.microsoft.com","teams.live.com","webex.com",
  "gotomeeting.com","whereby.com","skype.com","meet.jit.si","bluejeans.com",
  "chime.aws","gather.town","around.co","calendly.com","hackerrank.com",
  "codility.com","hirevue.com","karat.com","interviewstreet.com","mettl.com","google.com","microsoft.com"
];
Argus.SUSPICIOUS_TLDS = [".tk",".ml",".ga",".cf",".gq",".top",".click",".live",".icu",".buzz",".rest",".monster",".quest",".cyou",".sbs"];
Argus.URL_SHORTENERS = ["bit.ly","tinyurl.com","cutt.ly","rb.gy","t.co","goo.gl","is.gd","rebrand.ly","shorturl.at","tiny.cc"];

/* ── Verified employers (mock B2B API-linked registry) ──── */
Argus.SEED_VERIFIED = [
  "TCS","Tata Consultancy Services","Infosys","Wipro","HCLTech","HCL Technologies",
  "Accenture","Zoho","Flipkart","Swiggy","Zomato","Freshworks","Razorpay","Paytm",
  "Google","Microsoft","Amazon","Deloitte","Cognizant","Capgemini","Tech Mahindra","LTIMindtree"
];

/* ── Verified Employer Registry (badge program members) ─── */
/* Registry entries carry a trust badge only — scan metrics
   accumulate exclusively from real analyses on this device.  */
Argus.SEED_REGISTRY = [
  "Tata Consultancy Services", "Infosys", "Wipro", "HCLTech",
  "Zoho", "Freshworks", "Razorpay", "Flipkart",
];

/* ── Network threat-intelligence feed (curated blocklist) ─ */
Argus.SEED_SCAMLIB = [
  { type:"upi",    value:"quickjobs2026@ybl",       note:"Registration-fee collection for fake data-entry jobs", seeded:true },
  { type:"upi",    value:"hrpayments.elite@oksbi",  note:"'Security deposit' demanded after fake offer letter",  seeded:true },
  { type:"phone",  value:"+91 98XXXX2210",          note:"WhatsApp recruiter demanding Aadhaar + PAN upfront",   seeded:true },
  { type:"phone",  value:"+91 76XXXX8894",          note:"Part-time task scam — Telegram onboarding",            seeded:true },
  { type:"email",  value:"careers-tcshiring.in",    note:"Typosquat domain impersonating TCS recruitment",       seeded:true },
  { type:"email",  value:"hr.infosys-jobs.co",      note:"Fake Infosys offer letters with payment QR codes",     seeded:true },
  { type:"website",value:"linkedin-jobs.verify-in.top", note:"Credential-phishing clone of LinkedIn login",      seeded:true },
];

/* ── Curated threat advisories (editorial, not metrics) ─── */
Argus.SEED_ALERTS = [
  { severity:"crit",    title:"Fake logistics-hiring wave targeting metro cities",
    detail:"Identical 'delivery partner manager' posts demanding onboarding fees are circulating on LinkedIn and WhatsApp. No legitimate logistics employer charges to onboard." },
  { severity:"serious", title:"'Part-time task' scams recruiting via Telegram",
    detail:"Task groups pay small amounts first, then demand deposits to 'unlock' larger payouts. Exit the moment your own money is requested." },
  { severity:"warn",    title:"Typosquat careers domains impersonating IT majors",
    detail:"Domains mimicking TCS / Infosys career portals are registered regularly. Always reach a careers page by typing the company's official domain yourself." },
];

/* ── City coordinates for region tagging ────────────────── */
Argus.CITY_PATTERNS = ["bengaluru","bangalore","delhi","gurgaon","gurugram","noida","hyderabad","mumbai","pune","chennai","kolkata","belgaum","ahmedabad","jaipur","kochi","indore","lucknow","chandigarh","coimbatore","remote"];

/* ── Safe Learning Hub modules ──────────────────────────── */
Argus.LEARN_MODULES = [
  { icon:"🎣", title:"Engagement Bait 101",
    body:"Why 'Comment INTERESTED below' is almost never how real hiring works — and how recruiters farm your engagement to inflate reach. Real jobs use application links (ATS systems like Greenhouse, Lever, Workday, or company career portals), because recruiters legally need structured applications. If the only way in is a comment or a DM, the post's purpose is reach, not hiring.",
    tips:["Real openings link to a careers page or ATS","A comment never enters you into any hiring pipeline","Check if the poster actually works at the company (tenure > 1 year)"] },
  { icon:"💸", title:"The Registration-Fee Trap",
    body:"No legitimate employer in India charges you to get hired. 'Registration fee', 'security deposit', 'training kit charges', 'GST on offer letter' — every one of these is the scam itself. The job never existed; the fee is the product. This is the single most common job fraud pattern reported to Indian cybercrime portals.",
    tips:["Any upfront payment request = walk away immediately","Report the UPI handle at cybercrime.gov.in and in the Argonaut Scam Library","Genuine offer letters never carry payment QR codes"] },
  { icon:"🪪", title:"Identity Theft Red Flags",
    body:"Scammers harvest Aadhaar, PAN, and bank details through fake onboarding forms — then use them for benami accounts, SIM fraud, and loan fraud in your name. A real employer collects KYC documents only AFTER a formal offer, through official HR systems, never over WhatsApp.",
    tips:["Never share Aadhaar/PAN before a written offer on company letterhead","KYC happens on official HRMS portals, not Google Forms","Use the Applicant Vault to track exactly what you shared and where"] },
  { icon:"🕵️", title:"Verifying a Recruiter in 90 Seconds",
    body:"Three checks defeat most fakes: (1) The poster's profile — real recruiters show 1+ years tenure and consistent history at the company. (2) The email domain — name@company.com, never Gmail/Yahoo/Outlook. (3) The careers page — the exact role should exist on the company's official site or its ATS. Argonaut flags whether an official application link is present and prompts you to confirm it directly.",
    tips:["Cross-check the recruiter on the company's LinkedIn 'People' tab","Official domains only — hr.company@gmail.com is disqualifying","Run the post through the Argonaut scanner before applying"] },
  { icon:"📱", title:"WhatsApp-Forward Job Scams",
    body:"Forwarded 'openings' with a personal number are the highest-risk category Argonaut tracks. They combine urgency ('only 5 seats'), unrealistic pay, and personal contact channels — engineered to move you off-platform where there's no moderation or paper trail.",
    tips:["Screenshot it and scan it — Argonaut reads images with perceptual fingerprinting","Never continue a job conversation into Telegram 'task groups'","Warn the group you received it in — link them your Argonaut scan result"] },
];

/* ── Spot-the-scam quiz ─────────────────────────────────── */
Argus.QUIZ = [
  { post:"🚨 URGENT HIRING 🚨 50 freshers needed for International BPO. Salary ₹45,000/month. NO INTERVIEW. Comment 'YES' and WhatsApp 98xxxxxx10. Registration ₹500 only. Limited seats!!",
    answer:"scam", why:"Registration fee + no interview + WhatsApp-only contact + engagement bait — four HIGH severity flags. Real BPOs never charge to onboard." },
  { post:"We're hiring a Backend Engineer (Python/Django) for our Payments team in Bengaluru. 3-5 yrs exp. Apply: careers.razorpay.com/jobs/1234. Interview: 1 screening + 2 technical rounds + hiring manager. — Priya S., Engineering Manager @ Razorpay",
    answer:"legit", why:"Official careers link, specific tech stack and team, explained interview process, named poster with designation — classic green-flag pattern." },
  { post:"Amazon is hiring Work From Home part-time associates! Earn ₹8,000 daily just liking products. Join our Telegram to start earning instantly: t.me/amazontasks_official",
    answer:"scam", why:"'Earn daily by liking products' is the task-scam template. Amazon never hires via Telegram. Payouts stop once you deposit your own money to 'unlock tasks'." },
  { post:"Tag 3 friends who need a job! 🔥 We have 200+ openings across India in EVERY domain. DM me 'CAREER' to get the full list. Shortlisting is LIVE now!",
    answer:"scam", why:"Engagement farming (tag friends, DM keyword), zero specifics about any actual role, false urgency. Even if a job exists somewhere, this post is bait." },
  { post:"Infosys BPM walk-in drive — Process Executive, Pune. 21-23 July, 9:30 AM, Hinjewadi Phase 2 campus. Carry updated CV + govt ID. Freshers eligible. Details on infosys.com/careers.",
    answer:"legit", why:"Specific venue, dates, official domain, standard walk-in format. Verifiable against the company's own careers page — which is exactly what Argus checks." },
];

/* ── Verdict / verification display configs ─────────────── */
/* Earth-toned status palette — CVD-validated on the light surface
   (worst adjacent-pair ΔE 12.7 under deutan simulation, ≥12 target) */
Argus.VERIF_CFG = {
  VERIFIED:           { icon:"✅", color:"#4d6a38", bg:"rgba(77,106,56,.07)",   border:"rgba(77,106,56,.28)",  label:"Recognised employer + official link" },
  PARTIALLY_VERIFIED: { icon:"🔍", color:"#5d7a45", bg:"rgba(93,122,69,.06)",   border:"rgba(93,122,69,.25)",  label:"Official application link detected" },
  NOT_FOUND:          { icon:"⚠️", color:"#9c4a10", bg:"rgba(156,74,16,.07)",   border:"rgba(156,74,16,.28)",  label:"No official listing detected" },
  COMPANY_UNVERIFIED: { icon:"❌", color:"#a03c2c", bg:"rgba(160,60,44,.06)",   border:"rgba(160,60,44,.28)",  label:"Company not in recognised registry" },
  INCONCLUSIVE:       { icon:"❓", color:"#8a7a63", bg:"rgba(160,140,114,.08)", border:"rgba(160,140,114,.3)", label:"No official link — verify directly" },
};
Argus.VTYPE_CFG = {
  ACTUAL_SCAM:     { icon:"🚨", color:"#a03c2c", label:"Actual Scam"     },
  ENGAGEMENT_BAIT: { icon:"🎣", color:"#a37b25", label:"Engagement Bait" },
  SUSPICIOUS:      { icon:"🔎", color:"#9c4a10", label:"Suspicious"      },
  LEGITIMATE:      { icon:"✅", color:"#4d6a38", label:"Legitimate"      },
};
Argus.scoreStyle = function(score){
  if (score >= 81) return { color:"#4d6a38", glow:"rgba(77,106,56,.22)",  border:"rgba(77,106,56,.32)"  };
  if (score >= 66) return { color:"#5d7a45", glow:"rgba(93,122,69,.2)",   border:"rgba(93,122,69,.3)"   };
  if (score >= 46) return { color:"#a37b25", glow:"rgba(163,123,37,.2)",  border:"rgba(163,123,37,.32)" };
  if (score >= 26) return { color:"#9c4a10", glow:"rgba(156,74,16,.2)",   border:"rgba(156,74,16,.32)"  };
  return               { color:"#a03c2c", glow:"rgba(160,60,44,.22)",  border:"rgba(160,60,44,.32)"  };
};
