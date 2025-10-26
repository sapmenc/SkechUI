import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
 import { isBypassRoutes,isPublicRoutes,isProtectedRoutes } from "./lib/permissions";

const BypassMatcher=createRouteMatcher(isBypassRoutes)
const PublicMatcher=createRouteMatcher(isPublicRoutes)
const ProtectedMatcher=createRouteMatcher(isProtectedRoutes)

export default convexAuthNextjsMiddleware(async(request,{convexAuth})=>{
    // You can add custom middleware logic here if needed
    //to check this matcher we have to add bypass matcher and have to add bypass routes in lib/permissions.ts  
    if(BypassMatcher(request)){
        return;
    }
    const authed=await convexAuth.isAuthenticated();
    if(PublicMatcher(request) && authed){
        return nextjsMiddlewareRedirect(request,'/dashboard')
    }
    if(ProtectedMatcher(request) && !authed){
        return nextjsMiddlewareRedirect(request,'/auth/sign-in')
    }
    return
},{
    cookieConfig:{maxAge:60*60*24*30} //30 days
});
 
export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 

// Use in your middleware.ts to enable your Next.js app to use Convex Auth for authentication on the server.

// @returns — A Next.js middleware.