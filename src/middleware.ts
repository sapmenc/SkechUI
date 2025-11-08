import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
import { isBypassRoutes,isPublicRoutes,isProtectedRoutes } from "./lib/permissions"; 

const publicMatcher=createRouteMatcher(isPublicRoutes);
const protectedMatcher=createRouteMatcher(isProtectedRoutes);
const bypassMatcher=createRouteMatcher(isBypassRoutes);

export default convexAuthNextjsMiddleware(async(request,{convexAuth})=>{
      if(bypassMatcher(request)) return; //bypass auth check for these routes
      const authed=await convexAuth.isAuthenticated();
      if(publicMatcher(request) && authed){
         //redirect to dashboard if already logged in
         return nextjsMiddlewareRedirect(request,'/dashboard')
      }
      //if not logged in and trying to access protected route, redirect to sign-in
      if(protectedMatcher(request) && !authed){
          return nextjsMiddlewareRedirect(request,'/auth/sign-in')
      }
      return;
},{
    cookieConfig:{
        maxAge:60*60*24*30 //30 days
    }
});
 
export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};