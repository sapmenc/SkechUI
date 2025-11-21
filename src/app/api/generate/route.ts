import { InspirationImagesQuery, StyleGuideQuery } from "@/convex/query.config";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request:NextRequest){
    try {
      //grab the formdata , image etc
      const formData=await request.formData()
      const imageFile=formData.get('image') as File
      const projectId=formData.get('projectId') as string

      if(!imageFile){
         return NextResponse.json(
            {error:'No image file Provided'},
            {status:400}
         )
      }

      //validate file type. checks image or not
      if(!imageFile.type.startsWith('image/')){
        return NextResponse.json(
            {error:'Invalid file type.Only images are allowed'},
            {status:400}
        )
      }

      //TODO: Add the balance credit logic

      const imageBuffer=await imageFile.arrayBuffer()
      const base64Image=Buffer.from(imageBuffer).toString('base64')
      const styleGuide=await StyleGuideQuery(projectId)
      const guide=styleGuide.styleGuide._valueJSON as unknown as {
         colorSections:string[],
         typographySections:string[]
      }

      const inspirationImages=await InspirationImagesQuery(projectId)

    } catch (error) {
        
    }
}