import { auth } from '@/auth'

// Runs on every request at the edge — reads session from JWT cookie,
// makes it available to server components and route handlers.
// No routes are blocked here; gating is enforced per-action server-side.
export default auth

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
