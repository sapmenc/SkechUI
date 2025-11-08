//put all slices here
import { Reducer } from "@reduxjs/toolkit";
import profile from './profile'
import projects from './projects'
import shapes from './shapes'
import viewport from './viewport'
export const slices:Record<string,Reducer>={
    //inside we pass all the slices
     profile,
     projects,
     shapes,
     viewport
}