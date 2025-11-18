import { inngest } from "./client";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";


export const autosaveProjectWorkflow=inngest.createFunction(
    {id:'autosave-project-workflow'},
    {event:'project/autosave.requested'},
    async({event})=>{
        const {projectId,userId,shapesData,viewportData}=event.data
        try {
            await fetchMutation(api.projects.updateProjectSketches,{
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
