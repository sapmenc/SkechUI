import {mutation, query} from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"

export const getProject=query({/// get a project by id with access control
    args:{projectId:v.id('projects')},
    handler:async(ctx,{projectId})=>{
      const userId=await getAuthUserId(ctx);
      if(!userId){
        throw new Error("Unauthorized");
      }
    //   get the project
      const project=await ctx.db.get(projectId);
      if(!project){
        throw new Error("Project not found");
      }
    //   check ownership or public access
    if(project.userId !==userId && !project.isPublic){
        throw new Error("Access denied");
    }
    return project
    }
})

export const createProject=mutation({
  args:{
    userId:v.id('users'),
    name:v.optional(v.string()),
    sketchesData:v.any(), //json structure from redux shapes state
    thumbnail:v.optional(v.string())
  },
  handler:async(ctx,{userId,name,sketchesData,thumbnail})=>{
    console.log('Convex creating project for user:',userId)
    
    const projectNumber=await getNextProjectNumber(ctx,userId)
    //create a name insert the project into db and return
    const projectName=name || `Project ${projectNumber}`
    const projectId=await ctx.db.insert('projects',{
      userId,
      name:projectName,
      sketchesData,
      thumbnail,
      projectNumber,
      lastModified:Date.now(),
      createdAt:Date.now(),
      isPublic:false
    })
    console.log(`Project Created:`,{
      projectId,
      name:projectName,
      projectNumber
    })
    return {
      projectId,
      name:projectName,
      projectNumber
    }
  }
})

async function getNextProjectNumber(ctx:any,userId:string):Promise<number>{
  //get or create project counter for this user
  const counter=await ctx.db.query('project_counters').withIndex('by_userId',(q:any)=>q.eq('userId',userId)).first()
  
  //if we don't find any create a new counter in the database
  if(!counter){
     await ctx.db.insert('project_counters',{
       userId,
       nextProjectNumber:2
     })
     return 1
  }
  //or increament the count for the next time
  const projectNumber=counter.nextProjectNumber
  await ctx.db.patch(counter._id,{
    nextProjectNumber:projectNumber+1
  })
  return projectNumber
}
