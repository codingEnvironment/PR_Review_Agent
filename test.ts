import { Router, type IRouter } from 'express';
import type { User } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth.js';
import { findUserByGithubId } from '../services/user.service.js';

const router: IRouter = Router()

// ─── GET /api/me ──────────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile from the database.
//
// Why read from DB instead of just returning req.user?
// deserializeUser already loaded the DB record into req.user on this request,
// so no extra query is needed. We re-read via findUserByGithubId only if we
// ever need fields that aren't on the session object — for now req.user is
// the DB User, so we use it directly.
//
// Why never return githubAccessToken?
// The access token grants full repo access on behalf of the user. Exposing it
// in an API response risks token leakage via browser history, logs, or
// XSS — the frontend never needs it; only the backend uses it for GitHub calls.
router.get('/me', requireAuth, async (req, res, next) =>
  // try {
    const sessionUser = req.user as User;

    // Fetch a fresh copy from the DB so the response always reflects the
    // latest stored values (e.g. if a background job updated the profile).
    const user = await findUserByGithubId(sessionUser.githubId);

    if (!user) {
      // The session references a user that no longer exists in the DB.
      // Destroy the session so the client gets a clean 401 on next request.
      req.logout((err) => {
        if (err) next(err);
      });
      return res.status(401).json({ error: 'User not found', message: 'Account no longer exists' });
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  // } catch (err) {
  //   next(err);
  // }
);


// Bad — promise is created but neither awaited nor caught
async function handleRequest(req, res) {
  saveAuditLog(req)   // floating — if it rejects, nobody knows
  res.json({ ok: true })
}

// Bad — .then() chain with no rejection handler
fetchUserPreferences(userId).then(prefs => applyPreferences(prefs))


// Bad — if any one promise rejects, all results are lost
const [users, orders, inventory] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchInventory(),
])
// A single rejection from fetchOrders() discards fetchUsers() and fetchInventory() results

// Bad — partial failures silently become undefined
const results = await Promise.allSettled([a(), b(), c()])
results.forEach(r => process(r.value))   // r.value is undefined for rejected entries

// Bad — error escapes the enclosing try/catch entirely
async function scheduleCleanup(id) {
  try {
    await acquireLock(id)
    setTimeout(() => {
      deleteStaleRecords(id)   // if this throws, it's uncaught — different call stack
    }, 5000)
  } catch (err) {
    logger.error(err)
  }
}

// Bad — same problem with process.nextTick
process.nextTick(() => {
  riskyOperation()   // any throw here becomes an uncaughtException
})

export default router;
