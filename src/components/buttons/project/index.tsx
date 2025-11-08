'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2,PlusIcon } from 'lucide-react'
import { useProjectCreation } from '@/hooks/use-project'
type Props={}

const CreateProject=(props:Props)=>{
    const {createProject,isCreating,canCreate}=useProjectCreation() 
    // /hooks/use-project.ts
    return (
        <Button variant="default"
        onClick={()=>createProject()}
        disabled={!canCreate || isCreating}
        className='flex items-center gap-2 cursor-pointer rounded-full'>
            {isCreating?(
               <Loader2 className='h-4 w-4 animate-spin'/>
            ):(
                <PlusIcon className='h-4 w-4'/>
            )}
            {isCreating ? 'Creating...' : 'New Project'}
        </Button>
    )
}

export default CreateProject

//create project button create and clicking on that project will be created
//create a separate hook useProjectCreation() ans import all the necessary functions