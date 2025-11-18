'use client'
import { useAppSelector } from '@/redux/store'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { useAutosaveProjectMutation } from '@/redux/api/project'

const Autosave = () => {
  const searchParams=useSearchParams()
  const projectId=searchParams.get('project')
  const user=useAppSelector((state)=>state.profile)
  const shapesState=useAppSelector((state)=>state.shapes)

  const [autosaveProject,{isLoading:isSaving}]=useAutosaveProjectMutation()

  const viewportState=useAppSelector((state)=>state.viewport)

  const abortRef=useRef<AbortController | null>(null)
  const debounceRef=useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef=useRef<string>('')
  const isReady=Boolean(projectId && user?.id)
   const [saveStatus,setsaveStatus]=useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  //get the shapes and viewport
  useEffect(()=>{
      if(!isReady){
        return
      }
      const stateString=JSON.stringify({
        shapes:shapesState,
        viewport:viewportState
      }) //You combine shapes and viewport into one JSON string.

      //is alredy last saved then return
      if(stateString===lastSavedRef.current){
        return
      }
    //  If a save was already scheduled → cancel it.
      if(debounceRef.current){
        clearTimeout(debounceRef.current)
      }

      //The save will happen only if the user stops changing shapes for 1 second.
      debounceRef.current=setTimeout(async() => {
         lastSavedRef.current=stateString
         if(abortRef.current){
            abortRef.current.abort()
         } 
         abortRef.current=new AbortController()
         setsaveStatus('saving')

         try {
            await autosaveProject({
                projectId:projectId as string,
                userId:user?.id as string,
                shapesData:shapesState,
                viewportData:{
                    scale:viewportState.scale,
                    translate:viewportState.translate
                },
            }).unwrap()
            setsaveStatus('saved')
            setTimeout(()=>setsaveStatus('idle'),2000)
         } catch (err) {
            if((err as Error)?.name==='AbortError') return
            setsaveStatus('error')
            setTimeout(()=>{
              setsaveStatus('idle')
            },3000)
         }
      }, 1000);

      //return and cleanup
      if(debounceRef.current){
         clearTimeout(debounceRef.current)
      }
  },[isReady,
    shapesState,
    viewportState,
    projectId,
    user?.id,
    autosaveProject
  ])

  //clear the debounce and abort ref
  // cleanup
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if(!isReady) return null

  if(isSaving){
    return (
        <div className='flex items-center'> 
           <Loader2 className='w-4 h-4 animate-spin'/>
        </div>
    )
  }

 
  switch(saveStatus){
    case 'saved' : 
       return (
          <div className='flex items-center'>
             <CheckCircle className='w-4 h-4'/>
          </div>
       )
    case 'error':
        return (
          <div className='flex items-center'>
             <AlertCircle className='w-4 h-4'/>
          </div>
        )
    default:
        return <></>
  }

}

export default Autosave
//here we check for the save status 
