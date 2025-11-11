'use client'

import { fetchProjectsSuccess } from "@/redux/slice/projects";
import { useAppDispatch } from "@/redux/store";
import React, { useEffect } from "react";

type Props={
    children:React.ReactNode,
    initialProjects:any
}
 
const ProjectsProvider=({children,initialProjects}:Props)=>{   
    const dispatch=useAppDispatch()
    useEffect(()=>{
   //initialize redux state with ssr data
   if(initialProjects?._valueJSON){
       const projectData=initialProjects._valueJSON
       dispatch(
         fetchProjectsSuccess({
            projects:projectData,
            total:projectData.length
         })
       )
   }

    },[dispatch,initialProjects])
    return <>
     {children}
    </>
}

export default ProjectsProvider