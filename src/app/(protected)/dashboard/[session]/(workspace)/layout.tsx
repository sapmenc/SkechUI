import Navbar from "@/components/navbar";
import { SubscriptionEntitlementQuery } from "@/convex/query.config";
import { combinedSlug } from "@/lib/utils";
import {redirect} from "next/navigation"
import React from "react";

type Props={
    children:React.ReactNode
}

const Layout=async({children}:Props)=>{
    const {entitlement,profileName}=await SubscriptionEntitlementQuery();
    if(!entitlement._valueJSON){ //if no entitlement, redirect to pricing page
        //remove billing hardcoded path
        // redirect(`/billing/${combinedSlug(profileName!,80)}`)   
        // redirect(`/dashboard/${combinedSlug(profileName!,80)}`)
    }
    return <div className="grid grid-cols-1">
        <Navbar/>
        {children}
        </div>
}

export default Layout;