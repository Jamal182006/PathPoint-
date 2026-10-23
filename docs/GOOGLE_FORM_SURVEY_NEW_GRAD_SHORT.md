# PathPoint — New Grad Job Seeker Survey (Short: 10 Questions, ~3 min)

**Target:** Graduated ≤24 months ago, actively seeking first/early career role  
**Goal:** Validate top pains & feature priorities for MVP

---

## GOOGLE FORMS SETUP

| Setting | Value |
|---------|-------|
| Title | PathPoint — New Grad Job Search (3 min) |
| Description | Recent grad struggling to find work? Help us build a better tool. Anonymous, 3 minutes. |
| Progress Bar | On |
| Confirmation | "Thanks! Want early access for new grads? Join waitlist at [link]" |

---

## 10 QUESTIONS (Copy-Paste Ready)

### Q1: When did you graduate? **{Screening}**
**Type:** Multiple choice (required)  
- Within 6 months
- 6–12 months ago
- 12–24 months ago
- More than 24 months ago → **Section: Submit form**
- Still a student → **Section: Submit form**

### Q2: Current status? **{Segment}**
**Type:** Multiple choice (required)  
- Unemployed, actively applying
- Part-time/gig, seeking full-time
- Full-time in wrong field, seeking career role
- Internship, seeking conversion
- Not actively looking → **Section: Submit form**

### Q3: Your #1 job search frustration? **{Top Pain}**
**Type:** Multiple choice (required)  
- Don't know which roles I'm qualified for
- "Experience required" for entry-level roles
- Can't translate school/projects into "experience"
- Losing track of applications & statuses
- Missing deadlines/follow-ups (no system)
- Tailoring resume/cover letter each time takes forever
- Ghosted — no reply, no status, no feedback
- Can't tell if a company is legit/good for first job
- Interview prep is a black box
- Other: [Short answer]

### Q4: How do you track applications now? **{Current Workaround}**
**Type:** Checkboxes (required)  
- I don't track them
- Spreadsheet (Excel/Sheets)
- Notion / Airtable / Trello
- Notes app / Paper
- Browser bookmarks / tabs
- Email folders / labels
- University career portal
- Job tracker app (Teal, Huntr, etc.)
- Other: [Short answer]

### Q5: Most valuable feature for you? **{Feature Priority}**
**Type:** Multiple choice (required)  
- **Verified entry-level feed** — Only 0–2 yr roles, companies vetted for new grad hiring
- **Auto application tracker** — Status updates: Applied → Screening → Interview → Offer
- **Master resume + per-role versions** — One base, clone & tailor per application
- **Document vault** — Transcripts, references, portfolio, certs; attach per app
- **Experience translator** — Turn coursework, capstones, org leadership into "experience entries"
- **Smart reminders** — Deadlines, follow-up nudges, interview prep timeline
- **Company trust signals** — Verification badge, new grad retention, promo path, salary band
- **Interview prep hub** — Company guides, common questions, STAR coach
- **Application analytics** — Your funnel: apps → screens → interviews → offers → conversion
- **Alumni/peer insights** — Where grads from your school/major landed; referrals

### Q6: How likely to switch to PathPoint if it had your #1 feature? **{Switch Intent}**
**Type:** Linear scale (required)  
1 = Not at all likely — 5 = Extremely likely

### Q7: Willing to pay for premium? **{Pricing Signal}**
**Type:** Multiple choice (required)  
- Only if free
- $5–10/month
- $10–20/month
- $20+/month
- Not sure

### Q8: What would make you hesitate? **{Adoption Blockers}**
**Type:** Checkboxes (required, select all)  
- Learning curve / setup time
- Don't want another account/password
- Data privacy (student info, applications)
- Happy with current tool (spreadsheet, Notion, etc.)
- Need LinkedIn/Indeed/Handshake integration
- Need mobile app
- Don't trust a new platform with my career data
- Need university career center endorsement
- Cost (if not free)
- Other: [Short answer]

### Q9: "PathPoint solves a real problem I have as a new grad." **{Problem/Solution Fit}**
**Type:** Linear scale (required)  
1 = Strongly Disagree — 5 = Strongly Agree

### Q10: One thing you wish existed for new grad job seekers? **{Open Discovery}**
**Type:** Long answer text (optional)

---

## CONDITIONAL LOGIC (3 branches)

| Question | Condition | Action |
|----------|-----------|--------|
| Q1 | "More than 24 months" OR "Still a student" | Go to Section: "Thanks, not eligible" → Submit |
| Q2 | "Not actively looking" | Go to Section: "Thanks, not eligible" → Submit |
| All others | — | Continue to next |

---

## ANALYSIS QUICK-LOOK

| Metric | Question | Target Signal |
|--------|----------|---------------|
| **Top pain** | Q3 | >30% on one item = clear MVP hook |
| **Current workaround** | Q4 | "Don't track" + "Spreadsheet" = low switching cost |
| **Feature priority** | Q5 | Top 2 = MVP scope |
| **Switch intent** | Q6 | ≥40% rating 4-5 = pull exists |
| **Willingness to pay** | Q7 | >20% paying = viable freemium |
| **Blockers** | Q8 | Top 2 = address in onboarding/marketing |
| **Fit score** | Q9 | Mean ≥3.8 = problem/solution fit |
| **Surprises** | Q10 | Code for new features/positioning |

---

## EVEN SHORTER: 6-Question Micro (90 sec)

For social/QR code distribution:

1. **Graduated when?** (≤6mo / 6-12 / 12-24 / 24+ → screen / Student → screen)
2. **Status?** (Unemployed / Part-time / Wrong FT / Intern / Not looking → screen)
3. **#1 frustration?** (Radio: 9 options + Other)
4. **Most wanted feature?** (Radio: 10 options)
5. **Switch likelihood?** (1-5)
6. **One wish?** (Open text)

---

*PathPoint — New Grad Survey (Short) • 2026*