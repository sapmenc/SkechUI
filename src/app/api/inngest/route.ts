//group of functions served on a single endpoint. functions that are hosted on that endpoint
//here we export the server or endpoint
import { inngest } from '@/inngest/client'
import { autosaveProjectWorkflow } from '@/inngest/functions'
import {serve} from 'inngest/next'

export const {GET, POST, PUT}=serve({
    // pass the inngest clients and the functions
    client:inngest,
    functions:[autosaveProjectWorkflow], //all background jobs needs to go inside the array
})