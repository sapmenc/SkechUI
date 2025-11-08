//build the providers so that we can pass the data

//get the store ref + pass preloaded state

'use client'
import React,{ReactNode,useRef} from "react"
import { makeStore } from "./store"
import { RootState } from "./store"
import { Provider } from "react-redux"
const ReduxProvider=({
    children,
    preloadedState
}:{
    //datastructure        
    children:ReactNode
    preloadedState?:Partial<RootState>
}
)=>{
    const storeRef=useRef(makeStore(preloadedState))
    return <Provider store={storeRef.current}>{children}</Provider>
}
export default ReduxProvider;