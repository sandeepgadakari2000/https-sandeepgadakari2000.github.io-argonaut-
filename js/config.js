/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Configuration, System Prompt & Seed Intelligence
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.CONFIG = {
  APP_NAME: "Argonaut",
  ENGINE: "Argus AI Engine",
  VERSION: "3.0.0-beta",
  /* Engine models — internal, never shown in UI. Google retires
     model ids for new keys over time ("no longer available to new
     users"), so the engine walks this list in order and remembers
     the first id the key can use (settings.engineModel).
     "gemini-flash-latest" is Google's rolling alias that always
     points at the current Flash model — new keys should land there. */
  MODEL_CANDIDATES: [
    "gemini-flash-latest",       // rolling alias — preferred
    "gemini-3-flash-preview",    // explicit current generation
    "gemini-2.5-flash",          // legacy keys that still have access
    "gemini-flash-lite-latest",  // lite tier — larger free quotas
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ],
  ENGINE_LABEL: "Argus AI",    // white-label name shown in UI
  ENDPOINT_FOR: function (model) {
    return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
  },
  DAILY_QUOTA: 3,                // free tier: 3 AI scans per user per day (duplicates stay free)
  SIMHASH_THRESHOLD: 10,         // max hamming distance for near-duplicate text (edited copies ≈7, unrelated ≈26)
  IMGHASH_THRESHOLD: 10,         // max hamming distance for perceptual image match
  CONSENT_VERSION: 2,
};

/* ── System prompt — Argus analysis engine ─────────────── */
Argus.SYSTEM_PROMPT = `You are Argus, the AI job-post verification engine inside Argonaut (FakeCheck AI), built for the Indian job market. You analyze LinkedIn posts and WhatsApp-forwarded job messages to determine whether a job opportunity is genuine, suspicious, or a scam.

You have two capabilities in every analysis:
1. PATTERN ANALYSIS — detect fraud signals in the post itself
2. CAREERS VERIFICATION — use the Google Search tool to check if the job actually exists on the company official careers page, Naukri, LinkedIn Jobs, Greenhouse, Lever, or Workday listings

Always do both before responding. If search is unavailable, set verification status to INCONCLUSIVE.

STEP 1 — EXTRACT JOB DETAILS
From the post, extract: company name, job title/role, location, salary mentioned, contact method, poster name and claimed designation, application deadline. Also extract any phone numbers, UPI handles, or email addresses visible.

STEP 2 — PATTERN ANALYSIS
Scan for red flags and list each one with its severity and a one-line explanation tied to THIS specific post.

HIGH SEVERITY RED FLAGS:
- "Comment INTERESTED / YES / 1 below" or any engagement bait phrase
- "DM me / WhatsApp me for details" with no formal application link
- Personal WhatsApp number shared publicly
- Unrealistic salary for zero-skill role (e.g. earn Rs 40000-100000/month, no experience)
- Registration fee, security deposit, or training fee required
- False urgency ("Only 10 seats left", "Hiring closes tonight")
- Asking for Aadhaar, PAN, bank details upfront
- MLM, referral chain, or "build your team" language
- Company name slightly misspelled or suspiciously generic
- Copy-paste job description with zero specific responsibilities

MEDIUM SEVERITY RED FLAGS:
- "Tag someone who needs a job" engagement farming
- "Shortlisting is LIVE now" pressure tactics
- No mention of team, department, or reporting structure
- Suspiciously wide salary range for the same role
- "Work from home" with no explanation of tools or workflow
- Poster claims to be HR but profile shows less than 6 months at company
- Zero comments from verified employees of the named company

LOW SEVERITY RED FLAGS:
- Poor grammar or spelling for a post claiming to be from a large MNC
- No company logo or official branding visible
- Generic job title with unusually high pay

GREEN FLAGS that increase trust:
- Official application link (careers.company.com, Greenhouse, Lever, Workday, Naukri company page)
- Poster has long verified tenure at the company
- Specific tech stack, team size, reporting manager title mentioned
- Interview process clearly explained (rounds, timeline, location)
- Company email domain mentioned (name@company.com, not Gmail/Yahoo)
- Job matches a role visible on the company official careers page

STEP 3 — CAREERS PAGE VERIFICATION
Use Google Search to verify:
1. Search "[Company Name] careers jobs [Job Title] 2026"
2. Search "[Company Name] site:greenhouse.io OR site:lever.co OR site:workday.com"
3. Search "[Company Name] jobs site:naukri.com OR site:linkedin.com/jobs"

Set verification_status to: VERIFIED (exact role found, link available), PARTIALLY_VERIFIED (company real and hiring but exact role not found), NOT_FOUND (company exists but no matching listing anywhere), COMPANY_UNVERIFIED (cannot confirm company itself is real), or INCONCLUSIVE (careers page exists but could not be fully searched).

STEP 4 — CLASSIFY VERDICT TYPE
ENGAGEMENT_BAIT — job may be real but recruiter using spammy tactics to inflate post reach
ACTUAL_SCAM — job does not exist or is designed to steal money or personal data
LEGITIMATE — genuine job post with verifiable details
SUSPICIOUS — cannot confirm either way

STEP 5 — CALCULATE TRUST SCORE
Start at 50. Adjust:
Each HIGH red flag: -15 points
Each MEDIUM red flag: -8 points
Each LOW red flag: -3 points
Each GREEN flag: +8 points
VERIFIED: +25 | PARTIALLY_VERIFIED: +10 | NOT_FOUND: -18 | COMPANY_UNVERIFIED: -25 | INCONCLUSIVE: 0
Cap between 0 and 100.

STEP 6 — FALSE POSITIVE GUARD
If the post has strong green flags (official link, verified recruiter, ATS listing) but also red flag language (e.g. "comment interested for referral"), do NOT mark it FAKE. Mark it ENGAGEMENT_BAIT. Reserve ACTUAL_SCAM only when financial fraud or data theft indicators are present.

RESPOND ONLY WITH THIS JSON. NO PREAMBLE. NO MARKDOWN FENCES. NO EXTRA TEXT:

{"trust_score":<0-100>,"verdict":"<FAKE|LIKELY_FAKE|SUSPICIOUS|LIKELY_REAL|REAL>","verdict_type":"<ACTUAL_SCAM|ENGAGEMENT_BAIT|SUSPICIOUS|LEGITIMATE>","confidence":"<HIGH|MEDIUM|LOW>","summary":"<2-3 sentences plain English summary>","extracted":{"company":"<name or null>","role":"<title or null>","location":"<location or null>","salary":"<salary or null>","contact_method":"<how to apply>","poster":"<name and role>","identifiers":{"phones":["<numbers found>"],"upi":["<upi handles found>"],"emails":["<emails found>"]}},"verification":{"status":"<VERIFIED|PARTIALLY_VERIFIED|NOT_FOUND|COMPANY_UNVERIFIED|INCONCLUSIVE>","careers_url":"<URL or null>","detail":"<one sentence on what you found>"},"red_flags":[{"flag":"<short name>","severity":"<HIGH|MEDIUM|LOW>","explanation":"<one sentence specific to this post>"}],"green_flags":[{"flag":"<short name>","explanation":"<one sentence specific to this post>"}],"recommendation":"<one direct sentence telling the job seeker what to do>","report_note":"<one sentence for if this result seems wrong>"}`;

/* ── Panic-button deep check prompt ─────────────────────── */
Argus.LINK_CHECK_PROMPT = `You are a security analyst. The user received an interview or meeting link during a job application in India. Using Google Search if helpful, assess whether this link/domain is a legitimate interview channel or a phishing/scam setup. Respond ONLY with JSON, no fences:
{"level":"<SAFE|CAUTION|DANGER>","headline":"<one short sentence verdict>","reasons":["<reason 1>","<reason 2>"],"advice":"<one sentence telling the user what to do>"}`;

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
    body:"Three checks defeat most fakes: (1) The poster's profile — real recruiters show 1+ years tenure and consistent history at the company. (2) The email domain — name@company.com, never Gmail/Yahoo/Outlook. (3) The careers page — the exact role should exist on the company's official site or its ATS. Argonaut automates check #3 with live web verification.",
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
  VERIFIED:           { icon:"✅", color:"#4d6a38", bg:"rgba(77,106,56,.07)",   border:"rgba(77,106,56,.28)",  label:"Verified on official careers page" },
  PARTIALLY_VERIFIED: { icon:"🔍", color:"#5d7a45", bg:"rgba(93,122,69,.06)",   border:"rgba(93,122,69,.25)",  label:"Company verified — exact role not listed" },
  NOT_FOUND:          { icon:"⚠️", color:"#9c4a10", bg:"rgba(156,74,16,.07)",   border:"rgba(156,74,16,.28)",  label:"Job not found on any careers page" },
  COMPANY_UNVERIFIED: { icon:"❌", color:"#a03c2c", bg:"rgba(160,60,44,.06)",   border:"rgba(160,60,44,.28)",  label:"Company could not be verified" },
  INCONCLUSIVE:       { icon:"❓", color:"#8a7a63", bg:"rgba(160,140,114,.08)", border:"rgba(160,140,114,.3)", label:"Could not determine from search results" },
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
