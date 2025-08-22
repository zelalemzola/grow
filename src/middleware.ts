import { NextRequest, NextResponse } from 'next/server'

// We cannot import Clerk at the top level because it throws when secretKey is missing.
// Dynamically import and enable Clerk only when keys are present at runtime.
export default async function middleware(req: NextRequest) {
  const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY)
  if (!hasClerkSecret) {
    return NextResponse.next()
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')
  const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/api/(.*)',
    '/trpc/(.*)'
  ])

  const handler = clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  })

  // Call the generated handler
  // @ts-ignore - Clerk returns a function compatible with Next middleware handler
  return handler(req)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}