import { inngest } from "./client";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const autosaveProjectWorkflow=inngest.createFunction(
    {id:'autosave-project-workflow'},
    {event:'project/autosave.requested'},
    async({event})=>{
        const {projectId,userId,shapesData,viewportData}=event.data
        try {
            await convex.mutation(api.projects.updateProjectSketches,{
                projectId,
                sketchesData:shapesData,
                viewportData
            })

            return {success:true}
        } catch (error) {
            throw error
        }
    }
)
