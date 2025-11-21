import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";


export const getInspirationImages=query({
    args:{
        projectId:v.id('projects')
    },
    handler:async(ctx,{projectId})=>{
       const userId=await getAuthUserId(ctx)
       if(!userId){
         return []
       }

       //get the project and verify ownerrship
       const project=await ctx.db.get(projectId)
       if(!project || project.userId !==userId){
          return []
       }
    // get storage Ids
    const storageIds=project.inspirationImages || []

    //generate urls for each image
    const images=await Promise.all(
        storageIds.map(async(storageId,index)=>{
            try {
               const url=await ctx.storage.getUrl(storageId)  
               return {
                  id:`inspiration-${storageId}`, //unique id for client side tracking
                  storageId,
                  url,
                  uploaded:true,
                  uploading:false,
                  index, //preserve order
               }
            } catch (error) {
                console.warn(`[Convex] failed to get URL for inspiration storage ID ${storageId}`,error)
                return null
            }
        })
    )

    //Filter out any failed urls and sort by index
    const validImages=images.filter((image)=>image !==null).sort((a,b)=>a!.index-b!.index)

    return validImages
    }
})