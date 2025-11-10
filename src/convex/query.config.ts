import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { api } from "../../convex/_generated/api"
import {preloadQuery} from "convex/nextjs"
import {normalizeProfile,ConvexUserRaw} from "../types/user"
import { Id } from "../../convex/_generated/dataModel"

export const ProfileQuery=async()=>{ //to get the profile data
    return await preloadQuery(
        api.user.getCurrentUser, //@convex/user.ts
        {},
        {token:await convexAuthNextjsToken()}
    )
}

export const SubscriptionEntitlementQuery=async()=>{
    const rawProfile=await ProfileQuery()
    const profile=normalizeProfile(  //normalize it to our Profile type //@types/user.ts
        rawProfile._valueJSON as unknown as ConvexUserRaw | null
    )
    //preload the query for subscription entitlement
    const entitlement=await preloadQuery(
        api.subscription.hasEntitlement, //@convex/subscriptions.ts
        {userId:profile?.id as Id<'users'>}, //if no profile, it will be null and handled in the query
        {token:await convexAuthNextjsToken()}
    )
    return {entitlement,profileName:profile?.name || null}
}

// preloadQuery refers to a function used to fetch data for reactive client components on the server side before the client component renders. This enables server-side rendering (SSR) of initial data, which can then be seamlessly transitioned into a reactive subscription on the client side using Convex's real-time capabilities.

export const ProjectsQuery=async()=>{
     const rawProfile=await ProfileQuery()
    const profile=normalizeProfile(  //normalize it to our Profile type //@types/user.ts
        rawProfile._valueJSON as unknown as ConvexUserRaw | null
    )
    if(!profile?.id){
        return {projects:null,profile:null}
    }
    const projects=await preloadQuery(
        api.projects.getUserProjects,
        {userId:profile.id as Id<'users'>},
        {token:await convexAuthNextjsToken()}
    )
    return {projects,profile}
}


export const StyleGuideQuery=async(projectId:string)=>{
    const styleGuide=await preloadQuery(
        api.projects.getProjectStyleGuide,
        {projectId:projectId as Id<'projects'>},
        {token:await convexAuthNextjsToken()}
    )
    return {styleGuide}
}

export const MoodBoardImagesQuery=async(projectId:string)=>{
    const images = await preloadQuery(
        api.moodboard.getMoodBoardImages,{
            projectId:projectId as Id<'projects'>
        },
        {
            token:await convexAuthNextjsToken()
        }
    )
    return {images}
}