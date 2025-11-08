import {combineReducers,configureStore, Middleware, ReducersMapObject} from "@reduxjs/toolkit"
import { slices } from "./slice";
import { apis } from "./api";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

const rootReducer=combineReducers({
  //pass all the slices + apis
  ...slices,
  ...apis.reduce((acc,api)=>{
    acc[api.reducerPath]=api.reducer
    return acc
  },{} as ReducersMapObject),
})

export type RootState = ReturnType<typeof rootReducer>

//create a store + load the preloaded state using middleware 
export function makeStore(preloadedState?:Partial<RootState>){
    return configureStore({
        reducer:rootReducer,
        middleware:(gDM)=>gDM().concat(...apis.map((a)=>a.middleware as Middleware)),
        //pass everything that inside our apis
        preloadedState,
        devTools:process.env.NODE_ENV !=='production',
    })
}
export const store=makeStore(); 
export type AppStore=ReturnType<typeof makeStore>
export type AppDispatch=AppStore['dispatch']
export const useAppSelector:TypedUseSelectorHook<RootState>=useSelector
export const useAppDispatch=()=>useDispatch<AppDispatch>()