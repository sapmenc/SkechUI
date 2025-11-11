'use client'
import { useMutation } from "convex/react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"
import { Id } from "../../convex/_generated/dataModel"

export interface MoodBoardImage{
    id:string
    file?:File //optioanl for server-loaded images
    preview:string //local preview url or convex url
    storageId?:string
    uploaded:boolean
    uploading:boolean
    error?:string
    url?:string //convex url for uploaded image
    isFromServer?:boolean //Track if image cam from server
}

interface StylesFormdata{
    images:MoodBoardImage[]
}

export const useMoodBoard=(guideImages:MoodBoardImage[])=>{
    //keep track of the draging state
    const [dragActive,setDragActive]=useState(false)
    //get the project Id
    const searchParams=useSearchParams()
    const projectId=searchParams.get('project')
    //form to keep a deafult value
    const form=useForm<StylesFormdata>({
        defaultValues:{
            images:[]
        },
    })
    const {watch,setValue,getValues}=form
    const images=watch('images') //we can take a look what images are stored
    
    //helper mutation to save , remove , generate and upload url etc
    const generateUploadUrl=useMutation(api.moodboard.generateUploadUrl)
    const removeMoodBoardImage=useMutation(api.moodboard.removeMoodBoardImage)
    const addMoodBoardImage=useMutation(api.moodboard.addMoodBoardImage)

    const uploadImage=async(file:File):Promise<{storageId:string;url?:string}>=>{
        try {
            //generate the upload url and post the url in convex
        const uploadUrl=await generateUploadUrl()
        const result=await fetch(uploadUrl,{
            method:'POST',
            headers:{'Content-Type':file.type},
            body:file,
        })
        if(!result.ok){
            throw new Error(`Upload Failed:${result.statusText}`)
        }
        const {storageId}=await result.json()
        //Associate with project if we have a project id
        if(projectId){
            await addMoodBoardImage({
                projectId:projectId as Id<'projects'>,
                storageId:storageId as Id<'_storage'>
            })
        }
        return {storageId}
        } catch (error) {
            console.log(error)
            throw error
        }
        
    }
    
    //load all of the existing images from the server. if we have any client images we are going merge them into the array

    useEffect(()=>{
        if(guideImages && guideImages.length > 0){
            const serverImages:MoodBoardImage[]=guideImages.map((img:any)=>({
                id:img.id,
                preview:img.url,
                storageId:img.storageId,
                uploaded:true,
                uploading:false,
                url:img.url,
                isFromServer:true
            }))
            const currentImages=getValues('images')
            if(currentImages.length===0){
                setValue('images',serverImages)
            }
            else{
                //merge them
                const mergedImages=[...currentImages]

                serverImages.forEach((serverImg)=>{
                    // find the clientIndex to replace 
                    const clientIndex=mergedImages.findIndex((clientImg)=>clientImg.storageId===serverImg.storageId)

                    if(clientIndex===-1){
                        //clean up old blob url if it exists
                        if(mergedImages[clientIndex].preview.startsWith('blob:')){
                            URL.revokeObjectURL(mergedImages[clientIndex].preview)
                        }
                        //replace with server image
                        mergedImages[clientIndex]=serverImg
                    }
                })
                setValue('images',mergedImages)
            }
        }
    },[guideImages,setValue,getValues])

    const addImage=(file:File)=>{
        if(images.length >= 5){
            toast.error("Maximum 5 images allowed")
        }
        const newImage:MoodBoardImage={
            id:`${Date.now()}-${Math.random()}`,
            file,
            preview:URL.createObjectURL(file),
            uploaded:false,
            uploading:false,
            isFromServer:false
        }

        const updatedImages=[...images,newImage]
        setValue('images',updatedImages)
        toast.success("Image added to mood board")
    }
    //remove from server as well as locally
    const removeImage=async(imageId:string)=>{
        const imageToRemove=images.find((img)=>img.id===imageId)
        if(!imageToRemove){
            return;
        }
        //if serverimage with storageId remove from the convex
        if(imageToRemove.isFromServer && imageToRemove.storageId && projectId){
            try {
                await removeMoodBoardImage({
                    projectId:projectId as Id<'projects'>,
                    storageId:imageToRemove.storageId as Id<'_storage'>
                })
            } catch (error) {
                console.log(error)
                toast.error('Failed to remove image from server')
                return;
            }
        }
       //update image
       const updatedImages=images.filter((img)=>{
          if(img.id===imageId){
              //clean up preview url only for local images
              if(!img.isFromServer && img.preview.startsWith('blob:')){
                 URL.revokeObjectURL(img.preview)
              }
              return false
          }
          return true;
       }) 
       setValue('images',updatedImages)
       toast.success("Image Removed")
    }
    const handleDrag=(e:React.DragEvent)=>{
        e.preventDefault()
        e.stopPropagation()
        if(e.type==='dragenter' || e.type==='dragover'){
            setDragActive(true)
        }
        else if(e.type==='dragleave'){
            setDragActive(false)
        }
    }

    //when we drop something there will be some event
    const handleDrop=(e:React.DragEvent)=>{
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        //know the type of the file rhat is entering if not image -> not work
        const files=Array.from(e.dataTransfer.files)
        const imageFiles=files.filter((file)=>file.type.startsWith('image/'))
        if(imageFiles.length===0){
            toast.error("Please drop image files only")
            return
        }
        // go to each imageFiles and addImage()
        imageFiles.forEach((file)=>{
            if(images.length < 5){
                addImage(file)
            }
        })
    }

    const handleFileInput=(e:React.ChangeEvent<HTMLInputElement>)=>{
        const files=Array.from(e.target.files || [])
        files.forEach((file)=>addImage(file))

        //reset the input
        e.target.value=''
    }
    //add a background useEffect that upload the images as soon as they are added
    useEffect(()=>{
    const uploadPendingImages=async()=>{
        const currentImages=getValues('images')
        for(let i=0;i<currentImages.length;i++){
           const image=currentImages[i]
           if(!image.uploaded && !image.uploading && !image.error){
               //set uploading state for that image
               const updatedImages=[...currentImages];
               updatedImages[i]={...image,uploading:true}
               setValue('images',updatedImages)
               try {
                 const {storageId}=await uploadImage(image.file!)
                 const finalImages=getValues('images')
                 const finalIndex=finalImages.findIndex((img)=>img.id===image.id)
                 if(finalIndex !== -1){
                    finalImages[finalIndex]={
                        ...finalImages[finalIndex],
                        storageId,
                        uploaded:true,
                        uploading:false,
                        isFromServer:true
                    }
                    setValue('images',[...finalImages])
                 }
               } catch (error) {
                  console.log(error)
                  //get the error images index
                  const errorImages=getValues('images')
                  const errorIndex=errorImages.findIndex((img)=>img.id===image.id)
                  if(errorIndex !== -1){
                     errorImages[errorIndex]={
                        ...errorImages[errorIndex],
                        uploading:false,
                        error:'Upload Failed'
                     }
                     setValue('images',[...errorImages])
                  }
               }
           }
        }
    }
    //if there are still images left
    if(images.length > 0){
        uploadPendingImages()
    }
    },[images,setValue,getValues])

    //write a useEffect() to clean up the preview urls
    useEffect(()=>{
        return ()=>{
            images.forEach((image)=>{
                URL.revokeObjectURL(image.preview)
            })
        }
    },[])
    return {
        form,images,dragActive,addImage,removeImage,handleDrag,
        handleDrop,handleFileInput,
        canAddMore:images.length < 5
    }
}
