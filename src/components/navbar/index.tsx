'use client'
import { useSearchParams,usePathname } from "next/navigation"
import React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { CircleQuestionMark, Hash, LayoutTemplate, User } from "lucide-react"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { useAppSelector } from "@/redux/store"
import CreateProject from "../buttons/project"

type TabProps={
   label:string
   href:string
   icon?:React.ReactNode
}

const Navbar=()=>{
    //get the project Id
    const params=useSearchParams()
    const projectId=params.get('project')
    const pathname=usePathname()
    const hasCanvas=pathname.includes('canvas')
    const hasStyleGuide=pathname.includes('style-guide')

    const me=useAppSelector((state)=>state.profile)

    //create tabs
    const tabs:TabProps[]=[
    {
        label:'Canvas',
        href:`/dashboard//canvas?project=${projectId}`,
        icon:<Hash className="h-4 w-4"/>
    },
    {
        label:'Style Guide',
        href:`/dashboard/${me?.name}/style-guide?project=${projectId}`,
        icon:<LayoutTemplate className="h-4 w-4"/>
    }
]

   //1. write the fetch code
   //2. Handle loading states (show spinner)
   //3. Handle error (show error message)
   //4. Handle catching (Don't fetch same data twice)
   //5. Handle updating the UI when data changes

   //slice -> self contained piece of state

    


    //render the projects name : call a query -> /convex/projects.ts
    const project =useQuery(
        api.projects.getProject,
        projectId?{projectId:projectId as Id<'projects'>}:'skip' 
    )
    return(
        <div className="grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50">
           {/* create a grid - first link with project name */}
            <div className="flex items-center gap-4">
               <Link href={`/dashboard/${me.name}`}
               className="w-8 h-8 rounded-full border-3 border-white bg-black flex items-center justify-center">
                <div
                className="w-4 h-4 rounded-full bg-white"></div>
               </Link>
               {
                  !hasCanvas || (
                    !hasStyleGuide && (
                        <div className="lg:inline-block hidden rounded-full text-primary/60 border border-white/12 backdrop-blur-xl bg-white/8 px-4 py-2 text-sm saturate-150">
                          Project / {project?.name}
                        </div>
                    )
                  )
               }
            </div>
            
            <div className="lg:flex hidden items-center justify-center gap-2
            ">
               <div className="flex items-center gap-2 backdrop-blur-xl bg-white/8 border border-white/12 rounded-full p-2 saturate-150">
                {/* loop over all the tabs we have */}
                {
                    tabs.map((t)=>(
                        <Link 
                        key={t.href}
                        href={t.href}
                        className={[
                            'group inline-flex items-center gap-2 rounded-ful px-4 py-2 text-sm transition',`${pathname}?project=${projectId}`===t.href ? 'bg-white/12 text-white border border-white/16 backdrop-blur-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/6 border border-transparent'
                        ].join(' ')}>
                            <span className={
                                `${pathname}?project=${projectId}`===t.href ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'
                            }>
                             {t.icon}
                            </span>
                            <span>{t.label}</span>
                        </Link>
                    ))
                }
               </div>
            </div>
            <div className="flex items-center gap-4 justify-end">
              <span>TODO: Credits</span>
              <Button variant="secondary"
              className="rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/8 border border-white/12 saturate-150 hover:bg-white/12">
                 <CircleQuestionMark className="size-5 text-white"/>
              </Button>
              <Avatar className="size-12 ml-2">
                <AvatarImage src={me.image || ''}/>
                <AvatarFallback>
                    <User className="size-5 text-black"/>
                </AvatarFallback>
              </Avatar>
              {/* Todo : add autosave and create project */}

              {/* hascanvas && <Autosave/> */}

              {!hasCanvas && !hasStyleGuide && <CreateProject/>}

            </div>
        </div>
    )
}
export default Navbar;