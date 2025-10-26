export const isPublicRoutes=[
    '/auth(.*)',
    '/'
]

export const isProtectedRoutes=[
    '/dashboard(.*)',
]

export const isBypassRoutes=[ //routes to bypass permission checks
    "/api/polar/webhook",
    "/api/inngest(.*)",
    "/api/auth(.*)",
    "/convex(.*)"
];