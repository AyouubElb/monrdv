# 0005. Business signup and owner sign in: rationale

## Context

MonRDV gives each business its own subdomain, and tenant isolation is the headline of the portfolio. Signup is the one moment a business does not exist yet, so it runs on the root domain, while everything an owner does afterward runs on their subdomain with host only cookies (spec 0002). The feature has to bridge those two places without creating a session that could travel between them.

Spec 0001 already fixed the session model: argon2id, a 15 minute access token, a rotating 7 day refresh token in `__Host-` cookies, theft detection on reuse, rate limits, an Origin check, and "signup ends on Votre espace est prêt, then sign in on the subdomain". Specs 0002 and 0003 fixed the tables and the transaction helper for a new business. What remained open: where the owner's staff name comes from, what the signup, sign in, and first dashboard screens contain, what cleans up refresh token rows, and whether the password change endpoint ships now.

Forces: a 3 to 4 day solo build, owners signing up on phones, French copy, Moroccan law 09-08 for the owner's personal data, one API instance, and a strong preference for explicit simple code with few libraries. Refresh token rows pile up quickly (about 32 a day for an owner with the dashboard open all day), and the API's database role can only see one business at a time.

## Options considered

### Option 1: Two step signup, second sign in on the subdomain, cleanup as you go (chosen)

Signup on the root domain in two steps with an early subdomain check; the owner then signs in on their subdomain. Each login and refresh deletes that owner's own dead refresh rows inside their business.

**Pros**:
- No session ever exists on the root domain, and no code path crosses businesses.
- Theft detection from spec 0001 stays whole.
- No timer, no scheduler library, no extra database function.

**Cons**:
- The owner types their password again right after signup.
- Dead rows of owners who never return are never swept.

### Option 2: Signup signs the owner in directly through a one time handoff link

Signup returns a short lived one time code; the success button carries it to `<subdomain>/connexion/suite?code=...`, which exchanges it for cookies.

**Pros**:
- Smoothest path: no second password entry.

**Cons**:
- A new credential type travels in a URL (browser history, logs, referrers), with its own expiry, single use, and storage rules to get right.
- Spec 0001 explicitly chose no session from signup; this reopens an accepted decision for a small comfort gain.

### Option 3: Spec 0001 as written, with a nightly cross business cleanup

Same flow as option 1, but a timer in the API calls one `SECURITY DEFINER` function every 24 hours that deletes dead rows across all businesses.

**Pros**:
- Sweeps every dead row, including those of owners who never return.

**Cons**:
- Adds a function that bypasses row level security, the exact kind of code the isolation story wants to avoid.
- A scheduling piece to run, test, and reason about across restarts.

### Option 4: Delete the old row at each refresh

Keep only the live row of each login; rotation replaces it.

**Pros**:
- Nothing piles up; the simplest table.

**Cons**:
- A stolen refresh token can no longer be detected: if the thief refreshes first, the owner is just logged out and the thief keeps a working session for up to 7 days.
- The 20 second grace for two tabs refreshing at once is lost too.

## Rationale

Option 1 keeps the two properties that matter most here. The isolation headline stays honest: every auth query runs inside one business, which option 3 breaks with its bypass function. And the session stays as safe as spec 0001 designed it, which option 4 gives up. The cost is one extra password entry after signup (option 2 removes it, but adds a URL borne credential to a security critical path) and some dead rows that are never swept, which is a few hundred rows per abandoned device, harmless at this scale.

The two step form and the early check came from the engineer's choice of a lighter step per screen on phones. The early check exists because a taken address found only after step 2 would throw the owner back after they typed their account; checking on "Continuer" puts the error next to the field. The first name field gives the owner's staff row a real person's name, which customers see when they pick who serves them. Password change moves to the settings feature because no screen exists to use it yet, and an endpoint with no user is untested in practice.

The engineer chose a password rule of at least 8 characters with uppercase, lowercase, digit, and special character, over spec 0001's 12 to 128 characters with no forced types. Current OWASP and NIST guidance prefers the longer minimum with no composition rules, because composition rules push people to predictable patterns (`Password1!`) and a longer password resists guessing better. The engineer's rule works with the rest of the design (argon2id, rate limits, theft detection) and matches what owners expect from other sites; the tradeoff, weaker resistance to guessing for passwords near the minimum, is accepted consciously and recorded in Consequences.

Settings presets on the signup form follow the engineer's wish to set the booking rules at creation while keeping a phone friendly form with no typing. The required phone follows the engineer's choice so the "too late to cancel" message always has a number; it is enforced by the API, not the database, so the existing seed and migration stay untouched.
