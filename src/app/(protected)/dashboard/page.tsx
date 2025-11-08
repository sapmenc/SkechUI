// import React from 'react'
import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import {redirect} from 'next/navigation'

//remove billing hardcoded path
const Page=async()=>{
    const {entitlement,profileName}=await SubscriptionEntitlementQuery() //query.config.ts
    if(!entitlement._valueJSON){ //if no entitlement, redirect to pricing page
        // redirect(`/billing/${combinedSlug(profileName!,80)}`)
        redirect(`/dashboard/${combinedSlug(profileName!,80)}`)
    }
    redirect(`/dashboard/${combinedSlug(profileName!,80)}`)
    return <div>Page</div>
}

export default Page
 
//1. Add a subscription checker