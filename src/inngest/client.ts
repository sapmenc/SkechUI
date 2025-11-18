//create a client taht will send and reciece events
import {Inngest} from 'inngest'
import {realtimeMiddleware} from '@inngest/realtime'

export const inngest=new Inngest({
    id:'sketchUI',
    middleware:[realtimeMiddleware()],
})