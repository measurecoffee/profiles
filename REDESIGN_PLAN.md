# mc-profiles (app.measure.coffee) — UI/UX Redesign Plan

## The App

**Repo:** `~/dev/mc-profiles` (GitHub: `measurecoffee/profiles`, Vercel: `mc-profiles-live`)
**Live:** app.measure.coffee
**Stack:** Next.js 16, React 19, Tailwind v4, Supabase (auth + DB), OpenRouter (LLM), Stripe, Twilio
**Features:** Signup with phone verification → plan selection → chat with coffee agent → agent builds your coffee profile (L1 identity, L2 active context, L3 deep context) → profile page

## Current State vs Landing Page

The app already uses SOME landing page colors (cream bg #FAF8F5, espresso text #2C1810, warm brown #8B7355, taupe border #D4C5B0). But it's a generic SaaS form — NOT the warm artisanal experience the landing page promises.

### What's RIGHT (keep)
- Cream background (#FAF8F5) on all pages
- Espresso text (#2C1810) for headings
- Warm brown (#8B7355) for secondary text
- Taupe borders (#D4C5B0)
- Chat send button is rounded-full (pill)
- "Brewing a response..." loading text

### What's WRONG (fix)

| Problem | Current | Target |
|---------|---------|--------|
| **Typography** | Geist Sans + Geist Mono (body is Arial fallback!) | Inter + JetBrains Mono + Calistoga (display) |
| **Design tokens** | Hardcoded hex everywhere, @theme inline has 4 vars | Full coffee token system in globals.css |
| **Missing colors** | No copper, no gold, no mocha | copper #B87333, gold #C8A97E, mocha #4A3228 |
| **Anti-palette colors** | Blue/purple tier badges | Copper/gold tier styling |
| **Button rounding** | Most are rounded-lg, only chat send is rounded-full | All primary buttons rounded-full (pill) |
| **Navigation** | NONE — scattered text links between chat and profile | Sidebar (desktop) + Bottom nav (mobile) |
| **Chat UI** | No avatars, no timestamps, no markdown, no animations | Full chat experience with typing indicator |
| **Profile page** | Developer-facing (L1/L2/L3 labels, raw JSON debug) | User-facing coffee dashboard |
| **Animations** | Zero motion design | Message animations, micro-interactions, page transitions |
| **Mobile** | Chat works, profile grid breaks on small screens | Full mobile-first responsive |
| **Dark mode** | Generic #0a0a0a black | Warm espresso dark (#0C0A09) |

---

## Design System (Extend Existing)

### Colors — Add to globals.css @theme inline

```css
@theme inline {
  /* EXISTING (keep) */
  --color-background: #FAF8F5;
  --color-foreground: #171717;

  /* ADD: Coffee palette */
  --color-cream: #FAF8F5;
  --color-milk: #F5F1EC;
  --color-latte: #EDE8E1;
  --color-coffee: #1A0E07;
  --color-espresso: #2C1810;
  --color-mocha: #4A3228;
  --color-copper: #B87333;
  --color-gold: #C8A97E;
  --color-steam: rgba(255, 255, 255, 0.05);
  
  /* ADD: Semantic app tokens */
  --color-surface: #FFFFFF;
  --color-surface-muted: #F5F1EC;
  --color-border: #D4C5B0;
  --color-border-hover: #B8A99A;
  --color-text-primary: #2C1810;
  --color-text-secondary: #8B7355;
  --color-text-muted: #A89984;
  --color-primary: #2C1810;
  --color-primary-hover: #3D2918;
  --color-accent: #B87333;
  --color-accent-hover: #9A5E23;
  --color-destructive: #DC2626;
  --color-success: #059669;
  
  /* ADD: Dark mode tokens */
  --color-dark-bg: #0C0A09;
  --color-dark-surface: #1C1917;
  --color-dark-border: #292524;
  --color-dark-text: #F5F0EB;
  --color-dark-text-secondary: #A8A29E;
  
  /* ADD: Font families */
  --font-display: 'Calistoga', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ADD: Border radius */
  --radius-pill: 9999px;
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 4px;
}
```

### Typography

```
Display/Hero:  Calistoga — brand moments, section heroes
Body/UI:       Inter (300–700) — everything else
Data/Labels:   JetBrains Mono (500) — uppercase labels, timestamps, tier names

Type scale:
  - Hero:    clamp(2rem, 5vw, 2.75rem) — Calistoga
  - H2:      clamp(1.5rem, 3vw, 2rem) — Inter 600
  - H3:      1.25rem — Inter 600  
  - Body:    1rem (16px) — Inter 400, line-height 1.5
  - Small:   0.875rem (14px) — Inter 400
  - Label:   0.75rem (12px) — JetBrains Mono 500, uppercase, tracking-[0.1em]
```

### Spacing: 4px unit system
### Radius: Pill for buttons/badges, 8-12px for cards, 4px for inputs
### Shadows: Minimal. No decorative shadows. Borders for depth.

---

## Layout Architecture

### Desktop (>=1024px): Sidebar + Main

```
┌──────────────────────────────────────────────────┐
│ ┌────────┐ ┌─────────────────────────────────────┐│
│ │ ☕     │ │                                     ││
│ │measure │ │   [Chat / Profile / Calculator]     ││
│ │ .coffee│ │                                     ││
│ │────────│ │                                     ││
│ │💬 Chat │ │                                     ││
│ │  Today │ │                                     ││
│ │  Yest  │ │                                     ││
│ │⚗ Calc  │ │                                     ││
│ │👤 Prof │ │                                     ││
│ │⚙ Set   │ │                                     ││
│ │────────│ │                                     ││
│ │ [user] │ │                                     ││
│ └────────┘ └─────────────────────────────────────┘│
│  240px fixed   flex-1 scrollable                  │
└──────────────────────────────────────────────────┘
```

**Sidebar:**
- Top: measure.coffee logo + brand name (Calistoga)
- Nav: Chat (with History sub-menu), Brewing Calculator, Profile, Settings
- Chat sub-menu: expandable tree showing recent conversations grouped by time
- Bottom: user name + tier badge + avatar initial
- Active: copper bg highlight
- Collapsible to icon-only (64px)

### Mobile (<1024px): Bottom Nav + Stack

```
┌───────────────────────┐
│  measure.coffee       │  ← Brand bar (h-12)
│                       │
│  Page Content         │  ← Scrollable
│  (Chat / Prof /      │
│   Calc / Settings)    │
│                       │
├───────────────────────┤
│ 💬Chat  ⚗Calc  👤Prof │  ← Bottom nav (3-4 items)
└───────────────────────┘
```

**Mobile rules:**
- Bottom nav: Chat, Calculator, Profile (3 items)
- History via "History" button in chat header → full-screen overlay
- Settings accessible from Profile page (not separate nav item)
- Each item: icon + label, min 44x44pt touch target
- Active: copper color

---

## Route Structure (Current → Target)

### Current
```
/                    → redirect to measure.coffee
/auth/login          → login form
/auth/signup         → 3-step signup
/auth/callback       → Supabase OAuth callback
/account/chat        → chat with agent (CORE)
/account/profile     → profile view
/api/chat            → agent chat endpoint
/api/phone/send      → Twilio send
/api/phone/verify    → Twilio verify
/api/stripe/*        → Stripe billing
```

### Target
```
/                    → redirect to measure.coffee (KEEP)
/auth/login          → redesigned login (KEEP route, redesign UI)
/auth/signup         → redesigned signup (KEEP route, redesign UI)
/auth/callback       → KEEP as-is
/(app)/layout.tsx    → NEW: sidebar + main shell (auth-gated)
/(app)/chat          → REDIRECT from /account/chat
/(app)/chat/[id]     → NEW: conversation view
/(app)/calculator    → NEW: brewing calculator
/(app)/profile       → REDIRECT from /account/profile (redesigned)
/(app)/settings      → NEW: split from profile
/api/*               → KEEP as-is
```

**Migration strategy:** Add `(app)/` route group with sidebar shell. Add redirects from old `/account/*` routes. Don't delete old routes until new ones are verified.

---

## Implementation Phases

### Phase 0: Design System Foundation

**Goal:** Replace the empty globals.css with the full coffee token system. Fix typography. No visual changes to pages yet — just the foundation.

1. **Install correct fonts via next/font**
   - Replace Geist Sans/Mono with Inter + JetBrains Mono + Calistoga
   - Apply in root `layout.tsx`
   - Fix the Arial fallback bug

2. **Rewrite `globals.css`**
   - Full coffee color palette in `@theme inline`
   - Semantic tokens (surface, border, text-primary, accent, etc.)
   - Dark mode tokens
   - Font family tokens
   - Border radius tokens
   - Remove the old 4-var stub

3. **Create `lib/design-tokens.ts`** (optional TS reference mirroring CSS vars)

4. **Install dependencies**
   ```bash
   npm install lucide-react
   # Fonts via next/font/google (built-in)
   ```

**Verification:** Fonts load. CSS tokens are queryable in devtools. No visual regression on existing pages (same colors, just from tokens instead of hardcoded hex).

---

### Phase 1: Layout Shell + Navigation

**Goal:** Add the sidebar (desktop) and bottom nav (mobile). Wrap existing pages in the new shell.

1. **Create `(app)/` route group with shared layout**
   - `src/app/(app)/layout.tsx` — sidebar + main content
   - Auth-gated (reuse middleware logic)

2. **Build layout primitives** (`src/components/ui/`)
   - `<Sidebar>` — 240px fixed left, hidden <1024px
   - `<SidebarItem>` — icon + label + active state + expandable children
   - `<BottomNav>` — fixed bottom, hidden >=1024px
   - `<AppShell>` — wraps main content with proper padding, max-width per page type

3. **Sidebar contents:**
   - Brand: measure.coffee in Calistoga
   - Chat (Lucide MessageCircle) — expandable, shows recent conversations
   - Brewing Calculator (Lucide FlaskConical)
   - Profile (Lucide User)
   - Settings (Lucide Settings) — or accessible from Profile
   - Bottom: user initial + name + tier badge

4. **Bottom nav contents (mobile):**
   - Chat (MessageCircle)
   - Calculator (FlaskConical)
   - Profile (User)
   - 3 items, icon + label, copper active state

5. **Create new route files** (wrapping/redirecting from old):
   - `src/app/(app)/chat/page.tsx` — import/move chat page content
   - `src/app/(app)/profile/page.tsx` — import/move profile page content
   - Add redirects: `/account/chat` → `/(app)/chat`, `/account/profile` → `/(app)/profile`

6. **Slim brand bar** (mobile only)
   - Fixed top, h-12
   - "measure.coffee" in Calistoga, centered
   - Background: cream

**Verification:** Desktop shows sidebar with nav items. Mobile shows bottom nav. Clicking Chat navigates to chat (existing UI renders inside shell). Clicking Profile navigates to profile. Old `/account/*` URLs redirect. Auth still works. Landing page at root is UNCHANGED.

---

### Phase 2: Visual Overhaul — Kill Hardcoded Hex

**Goal:** Replace every hardcoded hex color with CSS tokens. Add copper/gold accents. Pill buttons everywhere. This is the BIG sweep.

**Per-page changes:**

1. **Login page** (`auth/login/page.tsx`)
   - `bg-[#FAF8F5]` → `bg-cream`
   - `text-[#2C1810]` → `text-text-primary`
   - `text-[#8B7355]` → `text-text-secondary`
   - `border-[#D4C5B0]` → `border-border`
   - Buttons: `rounded-lg` → `rounded-full` + copper hover
   - Add Calistoga "measure.coffee" heading
   - Add subtle warm gradient or texture to background

2. **Signup page** (`auth/signup/page.tsx`)
   - Same color token sweep
   - Buttons → `rounded-full`
   - Plan cards: Pro tier gets copper border + copper "Recommended" badge
   - Add step progress indicator (1 → 2 → 3 dots)
   - OTP input: pill-shaped individual digits
   - Gold accent on Pro tier price

3. **Chat page** (`account/chat/page.tsx` → `(app)/chat/page.tsx`)
   - Full color token sweep
   - Header: remove standalone header (sidebar handles it now)
   - User messages: copper background (`bg-accent`) instead of espresso
   - Agent messages: white card with espresso text (keep)
   - Both messages: `rounded-2xl` → keep (works well for chat bubbles)
   - Add Calistoga "measure.coffee agent" heading in sidebar, not in chat header
   - Input: already rounded-full, just update to tokens
   - Send button: copper accent instead of espresso
   - Add typing indicator (3 animated dots)
   - Add message entrance animation (slide-up + fade, 200ms)

4. **Profile page** (`account/profile/page.tsx` → `(app)/profile/page.tsx`)
   - Full color token sweep
   - Tier badges: replace blue/purple with coffee-palette badges
     - Trial: latte bg + mocha text
     - Basic: cream bg + copper text + copper border
     - Pro: espresso bg + gold text + gold border
   - Upgrade CTA: `rounded-full` + copper
   - L1/L2/L3 labels: rename to user-friendly names
     - L1 "Identity" → "Your Coffee Identity"
     - L2 "Active Context" → "What You're Working On"
     - L3 "Deep Context" → "Your Coffee Knowledge"
   - Hide raw JSON `<details>` behind a "Developer" toggle or remove for non-dev users
   - Add visual indicators for profile completeness (progress bar or checkmarks)
   - Section cards: warm border, subtle hover

**Verification:** Zero hardcoded hex remains (grep for `#[0-9A-Fa-f]{6}` in all .tsx files). All colors come from tokens. Copper accent used consistently. Buttons are pill-shaped. Profile tiers use coffee palette.

---

### Phase 3: Chat UI Enhancement

**Goal:** Make the chat feel like a premium AI agent, not a basic form.

1. **Message improvements:**
   - Add agent avatar (measure.coffee logo icon or coffee cup)
   - Add user avatar (initial circle in copper)
   - Add timestamps (JetBrains Mono, small, muted color)
   - Add markdown rendering (install `react-markdown` or `marked`)
   - Code blocks in JetBrains Mono with latte background

2. **Chat history (sidebar sub-menu on desktop)**
   - Expandable under "Chat" nav item
   - Groups: Today, Yesterday, Previous 7 Days, Older
   - Each item: first line truncated + relative timestamp
   - Click loads conversation
   - Active conversation highlighted

3. **Chat history (mobile)**
   - "History" button in chat header area
   - Opens full-screen overlay with conversation list
   - Swipe-to-delete

4. **Typing indicator**
   - Replace "Brewing a response..." text with animated 3-dot indicator
   - Coffee cup steam animation (optional, CSS keyframes)

5. **Empty state**
   - New conversation: warm greeting with coffee illustration
   - "What are you brewing today?" in Calistoga
   - Quick-start suggestion chips ("Help me dial in my espresso", "Equipment recommendations", "Troubleshoot my brew")

6. **Onboarding flow preservation**
   - Auto-send "Hi! I just signed up." on first visit still works
   - Agent greeting should feel warm and coffee-native
   - Profile save indicators (subtle toast: "Profile updated ✓")

**Verification:** Chat feels premium. Messages have avatars, timestamps, markdown. History works on desktop and mobile. Empty state is inviting. Onboarding flow preserved.

---

### Phase 4: Brewing Calculator

**Goal:** Add a coffee brewing calculator as a standalone tool in the app.

1. **Calculator page** (`src/app/(app)/calculator/page.tsx`)
   - Centered card layout, max-w-2xl
   - Swiss-style: clear hierarchy, generous whitespace

2. **Calculator modules** (`src/components/calculator/`)
   - `<BrewRatio>` — coffee:water → grams per cup
   - `<ExtractionYield>` — dose, yield, TDS → extraction %
   - `<TemperatureConverter>` — F ↔ C
   - Each card: warm border, JetBrains Mono for numbers
   - Live calculation (results update as you type)
   - Reset button per card

3. **Mobile:**
   - Cards stack vertically
   - Input height >= 44px
   - inputMode="decimal" on number fields
   - Results sticky-visible

**Verification:** Calculator works. Math is correct. Matches app design language. Responsive.

---

### Phase 5: Profile Page Redesign

**Goal:** Transform from developer-facing data dump to user-facing coffee dashboard.

1. **Rename sections** (user-friendly):
   - L1 "Identity" → "Your Coffee Identity"
   - L2 "Active Context" → "What You're Working On"
   - L3 "Deep Context" → "Your Coffee Knowledge"

2. **Visual redesign:**
   - Profile completeness indicator (progress circle or bar)
   - Each context level shows as a warm card with coffee-appropriate icons
   - L3 deep context items: show as a tag cloud or organized list (not raw key-value)
   - Tier section: prominent display with coffee-colored badges
   - Subscription actions: copper pill buttons
   - "Chat with agent" CTA: prominent, copper, pill-shaped

3. **Hide developer details:**
   - Raw JSON `<details>` → only show if user has a `?debug` query param or dev role
   - L1/L2/L3 labels → only in parentheses as small muted text, not as section headers

4. **Mobile:**
   - Single column layout
   - Cards stack
   - Identity section: single column on small screens (not 2x2 grid)

**Verification:** Profile feels like a personal coffee dashboard. No raw JSON visible. Sections have warm, user-friendly names. Tier badges use coffee palette.

---

### Phase 6: Settings Split + Final Polish

**Goal:** Split settings out of Profile. Add animations and final QC.

1. **Settings page** (`src/app/(app)/settings/page.tsx`)
   - Moved from Profile page: sign out, notification preferences, theme toggle
   - Sections: Account, Preferences, Danger Zone
   - Same warm card styling as Profile

2. **Animations:**
   - Sidebar expand/collapse: 200ms ease-out
   - Chat message entrance: 200ms slide-up + fade
   - Calculator result update: number counter animation
   - Page transitions: subtle fade (150ms)
   - All respect `prefers-reduced-motion`

3. **Micro-interactions:**
   - Hover: copper tint on interactive elements (150ms)
   - Press: scale(0.98) on buttons (100ms)
   - Focus: 2px copper ring
   - Loading: skeleton shimmer for chat

4. **Accessibility audit:**
   - WCAG AA contrast on all token pairs
   - Keyboard nav through entire app
   - Skip-to-content link
   - aria-labels on icon buttons
   - Screen reader testing

**Verification:** App feels cohesive. Keyboard-only nav works. No contrast failures. All animations respect reduced motion.

---

## Phase Summary

| Phase | What | Scope |
|-------|------|-------|
| 0 | Design system (fonts, tokens, globals.css) | Medium |
| 1 | Layout shell (sidebar + bottom nav + route group) | Large |
| 2 | Visual overhaul (kill hardcoded hex, pill buttons, copper accents) | Large |
| 3 | Chat UI enhancement (markdown, avatars, history, animations) | Large |
| 4 | Brewing Calculator (new feature) | Medium |
| 5 | Profile page redesign (user-facing, hide dev details, coffee badges) | Medium |
| 6 | Settings split + animations + accessibility | Medium |

**Ship strategy:**
- Phases 0-2: one PR (foundation + shell + visual sweep — they're interdependent)
- Phase 3: separate PR (chat is the core feature, needs focused testing)
- Phase 4: separate PR (new feature, isolated)
- Phase 5: separate PR (profile redesign)
- Phase 6: final PR (polish + a11y)

---

## Key Architecture Decisions

1. **Route group `(app)/`** wraps all authenticated app pages with sidebar shell
2. **Old `/account/*` routes redirect** to new `/(app)/*` — don't break existing bookmarks
3. **Landing page at root `/` is UNCHANGED** — separate repo, separate design
4. **App stays light mode** (cream background) — the current app is light, landing page is light. Dark mode is a toggle option, not default
5. **Chat is the default post-login page** (same as current — auto-sends "Hi! I just signed up.")
6. **Sidebar: 4 items** — Chat (with History), Calculator, Profile, Settings
7. **All icons Lucide** — no emoji
8. **Token-first CSS** — zero hardcoded hex in components

---

## Dependencies

```bash
npm install lucide-react react-markdown
# Fonts: via next/font/google (Inter, JetBrains Mono, Calistoga — built-in)
```

---

## File Structure (New + Modified)

```
src/
  app/
    globals.css                   ← REWRITE: full coffee token system
    layout.tsx                    ← UPDATE: Inter + JetBrains Mono + Calistoga fonts
    (app)/                        ← NEW route group
      layout.tsx                  ← NEW: sidebar + main shell
      chat/
        page.tsx                  ← MOVE from /account/chat (redesigned)
        [id]/page.tsx             ← NEW: conversation view (Phase 3)
      calculator/
        page.tsx                  ← NEW: brewing calculator (Phase 4)
      profile/
        page.tsx                  ← MOVE from /account/profile (redesigned)
      settings/
        page.tsx                  ← NEW: split from profile (Phase 6)
    account/                      ← KEEP temporarily, add redirects
      chat/page.tsx               ← ADD: redirect('(/app)/chat')
      profile/page.tsx            ← ADD: redirect('(/app)/profile')
    auth/
      login/page.tsx              ← UPDATE: token sweep + pill buttons
      signup/page.tsx             ← UPDATE: token sweep + pill buttons + step indicator
  components/
    ui/
      sidebar.tsx                 ← NEW
      sidebar-item.tsx            ← NEW
      bottom-nav.tsx              ← NEW
      app-shell.tsx               ← NEW
    chat/
      message.tsx                 ← NEW (extracted from chat page)
      message-input.tsx           ← NEW
      chat-history.tsx            ← NEW
      typing-indicator.tsx        ← NEW
    calculator/
      brew-ratio.tsx              ← NEW
      extraction-yield.tsx        ← NEW
      temperature-converter.tsx   ← NEW
    profile/
      identity-section.tsx        ← NEW (extracted from profile)
      context-section.tsx         ← NEW
      subscription-section.tsx    ← NEW
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking chat agent flow | Onboarding auto-send preserved. Agent API unchanged. Only the UI wrapper changes. |
| Old `/account/*` URLs break | Add redirect routes. Don't delete old files until new ones verified. |
| Profile page loses data | Only visual changes — same Supabase queries, same data model. |
| Mobile bottom nav covers chat input | Chat input positioned above bottom nav with padding-bottom. |
| Hardcoded hex grep misses some | Run `rg '#[0-9A-Fa-f]{6}' src/ --type tsx` after Phase 2 to verify zero remaining. |