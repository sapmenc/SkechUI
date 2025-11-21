import { Shape } from "@/redux/slice/shapes";
import React from "react";
import { Arrow } from "./arrow";
import { Elipse } from "./elipse";
import { Frame } from "./frame";
import { Stroke } from "./stroke";
import { Line } from "./line";
import { Rectangle } from "./rectangle";
import { Text } from "./text";
import GeneratedUI from "./generatedui";
export const ShapeRenderer=({
     shape,
     toggleInspiration,
     toggleChat,
     generateWorkFlow,
     exportDesign
}:{
    shape:Shape
    toggleInspiration:()=>void
    toggleChat:(generatedUIId:string)=>void
    generateWorkFlow:(generateUIId:string)=>void
    exportDesign:(generateUIId:string,element:HTMLElement | null)=>void
})=>{
   switch(shape.type){
      case 'frame':
        return (
            <Frame
            shape={shape}
            toggleInspiration={toggleInspiration}
            />
        )
      case 'rect':
        return <Rectangle shape={shape}/>
      case 'ellipse':
        return <Elipse shape={shape}/>
      case 'freedraw':
        return <Stroke shape={shape}/>
      case 'arrow':
        return <Arrow shape={shape}/>
      case 'line':
        return <Line shape={shape}/>
      case 'text':
        return <Text shape={shape}/>
      case 'generatedui':
        return (
           <GeneratedUI
           shape={shape}
           toggleChat={toggleChat}
           generateWorkFlow={generateWorkFlow}
           exportDesign={exportDesign}/>
        )
      
   }
}