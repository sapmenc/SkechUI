import { MoodBoardImagesQuery } from "@/convex/query.config";
import { MoodBoardImage } from "@/hooks/use-styles";
import { NextRequest, NextResponse } from "next/server";
import { prompts } from "@/prompts";
import {generateObject} from "ai"
import {anthropic} from "@ai-sdk/anthropic"
import z from 'zod'
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

const ColorSwatchSchema=z.object({
    name:z.string(),
    hexColor:z.string().regex(/^#[0-9A-Fa-f]{6}$/,'Must be valid hex color'),
    description:z.string().optional()
})

const PrimaryColorsSchema=z.object({
    title:z.literal('Primary Colours'),
    swatches:z.array(ColorSwatchSchema).length(4)
})

const SecondaryColorsSchema=z.object({
    title:z.literal('Secondary and Accent Colors'),
    swatches:z.array(ColorSwatchSchema).length(4)
})

const UIComponentColorsSchema=z.object({
    title:z.literal('UI component colors'),
    swatches:z.array(ColorSwatchSchema).length(6)
})

const UtilityColorsSchema=z.object({
    title:z.literal('Utility & Form Colors'),
    swatches:z.array(ColorSwatchSchema).length(3)
})

const StatusColorsSchema=z.object({
    title:z.literal('Status and Feedback Colors'),
    swatches:z.array(ColorSwatchSchema).length(2)
})

const TypographyStyleSchema=z.object({
    name:z.string(),
    fontFamily:z.string(),
    fontSize:z.string(),
    fontWeight:z.string(),
    lineHeight:z.string(),
    letterSpacing:z.string().optional(),
    description:z.string().optional()
})

const TypographySectionSchema=z.object({
    title:z.string(),
    styles:z.array(TypographyStyleSchema)
})

const StyleGuideSchema=z.object({
    theme:z.string(),
    description:z.string(),
    colorSections:z.tuple([
        PrimaryColorsSchema,
        SecondaryColorsSchema,
        UIComponentColorsSchema,
        UtilityColorsSchema,
        StatusColorsSchema,
    ]),
    typographySections:z.array(TypographySectionSchema).length(3)
})

export async function POST(request:NextRequest){
    try {
        const body=await request.json()
        const {projectId}=body
        if(!projectId){
            return NextResponse.json({
                error:'Project Id is required'
            },{status:400})
        }

        //to do : Add the balance credit part
       
        //grab all the mood board images from that project
        const moodBoardImages=await MoodBoardImagesQuery(projectId)
        if(!moodBoardImages || moodBoardImages.images._valueJSON.length===0){
            return NextResponse.json(
                {
                    error:'No Mood board image found. Please upload images to the mood board first'
                },
                {
                    status:400
                }
            )
        }
        const images=moodBoardImages.images._valueJSON as unknown as MoodBoardImage[]
        const imgUrls=images.map((img)=>img.url).filter(Boolean)
        const systemPrompt=prompts.styleGuide.system

        const userPrompt=`Analyze these ${imgUrls.length} mood board images and generate a design system: Extract colors that work harmoniously together and create typography that matches the aesthetic.Return ONLY the JSON Object matching the exact schema structure above`

        const result=await generateObject({
            model:anthropic('claude-sonnet-4-20250514'),
            schema:StyleGuideSchema,
            system:systemPrompt,
            messages:[
                {
                    role:'user',
                    content:[
                        {
                            type:'text',
                            text:userPrompt,
                        },
                        ...imgUrls.map((url)=>({
                            type:'image' as const,
                            image:url as string
                        })),
                    ],
                },
            ],
        })
        //if user has credits only the can use the ai. (TODO)

        //store all the generated style guide inside convex

        await fetchMutation(
            api.projects.updateProjectStyleGuide,{
                projectId:projectId as Id<'projects'>,
                styleGuideData:result.object
            },
            {token:await convexAuthNextjsToken()}
        )

        return NextResponse.json({
            success:true,
            styleGuide:result.object,
            message:'Style Guide Generated successfully',
        })
    } catch (error) {
        console.log('Error generating style guide',error)
        return NextResponse.json({
            error:'Failed to generate style guide',
            details:error instanceof Error ? error.message : 'Unknown Error'
        },{status:500})
    }
}