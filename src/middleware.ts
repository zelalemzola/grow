import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'


const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)'])

// If Clerk keys are missing in the environment, skip auth to avoid 500s.
// This ensures the app can start and you can at least reach public routes
// while server env is being configured.
const isClerkConfigured = Boolean(process.env.CLERK_SECRET_KEY)

export default clerkMiddleware(async (auth, req) => {
  if (!isClerkConfigured) {
    return
  }
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}