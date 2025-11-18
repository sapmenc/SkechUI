//we are going to create a patch request
import { error } from "console";
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
interface UpdateProjectRequest{
    projectId:string,
    shapesData:{
        shapes:Record<string,unknown>
        tool:string,
        selected:Record<string,unknown>
        frameCounter:number
    },
    viewportData?:{
        scale:number,
        translate:{x:number,y:number}
    }
}

export async function PATCH(request:NextRequest){
    try {

        //from body we are going to get all the details
         const body:UpdateProjectRequest & {userId?:string}= await request.json()
         const {projectId,shapesData,viewportData,userId}=body
         if(!projectId || !userId || !shapesData){
            return NextResponse.json({
                error:'Project Id , user Id and Shapes data are required'
            },{
                status:400
            })
         }

        //fire the inngest event-> one of those functions call
       const eventResult=await inngest.send({
         name:'project/autosave.requested',
         data:{projectId,userId,shapesData,viewportData}
       })

       return NextResponse.json({
        success:true,
        message:'Project Autosave Initiated',
        eventId:eventResult.ids[0]
       })

    } catch (error) {
        return NextResponse.json({
            error:"Failed to autosave Project",
            message:error instanceof Error ? error.message : 'Unknown Error'
        })
    }
}