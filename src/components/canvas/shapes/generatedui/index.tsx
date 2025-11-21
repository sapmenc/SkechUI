import React from "react";
import { GeneratedUIShape } from "@/redux/slice/shapes";
import { useUpdateContainer } from "@/hooks/use-styles";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Workflow } from "lucide-react";
type Props={
    shape:GeneratedUIShape,
    toggleChat:(generatedUIId:string)=>void
    generateWorkFlow:(generateUIId:string)=>void
    exportDesign:(generateUIId:string,element:HTMLElement | null)=>void
}

const GeneratedUI=({
    shape,
    toggleChat,
    generateWorkFlow,
    exportDesign
}:Props)=>{
    const {sanitizeHtml,containerRef}=useUpdateContainer(shape)
    
    const handleExportDesign=()=>{
        if(!shape.uiSpecData){
            console.warn('No UI data to export')
            return
        }
        //pass the actual dom element for snapshot
        exportDesign(shape.id,containerRef.current)
    }

    const handleGenerateWorkFlow=()=>{
        generateWorkFlow(shape.id)
    }

    const handleToggleChat=()=>{
        toggleChat(shape.id)
    }

    return (
        <div ref={containerRef}
        className="absolute pointer-events-none"
        style={{
            left:shape.x,
            top:shape.y,
            width:shape.w,
            height:'auto' //Auto height to grow with content
        }}>
          <div className="w-full h-auto relative rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm"
          style={{
            boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
            padding:'16px',
            height:'auto', //auto height to fit content
            minHeight:'120px',
            position:'relative'
          }}>
             <div className="h-auto w-full"
             style={
              {
                pointerEvents:'auto',
                height:'auto',
                maxWidth:'100%', //prevent horizontal overflow
                boxSizing:'border-box' //include padding in calculations
              }
             }>
              <div className="absolute -top-8 right-0 flex gap-2">
               <Button
               size="sm"
               variant="outline"
               onClick={handleExportDesign}
               disabled={!shape.uiSpecData}
               style={{pointerEvents:'auto'}}>           
               <Download size={12}/>
               Export
               </Button>
               <Button
               size="sm"
               variant="outline"
               onClick={handleGenerateWorkFlow}
               style={{
                pointerEvents:"auto"
               }}>
                  <Workflow size={12}/>
                  Generate Workflow
               </Button>
               <Button
               size="sm"
               variant="outline"
               onClick={handleToggleChat}
               style={{
                pointerEvents:'auto'
               }}>
                <MessageCircle size={12}/>
                Design Chat
               </Button>
              </div>
              {shape.uiSpecData ? (
                <div className="h-auto"
                dangerouslySetInnerHTML={{
                    __html:sanitizeHtml(shape.uiSpecData),
                }}/>
              ):(
                <div className="flex items-center justify-center p-8 text-white/60">
                 <div className="animate-pulse">
                    Generating Design...
                 </div>
                </div>
              )}
             </div>
          </div>
          <div className="absolute -top-6 left-0 text-xs px-2 py-1 rounded whitespace-nowrap text-white/60 bg-black/40" style={{
            fontSize:'10px'
          }}>
             Generated UI
          </div>
        </div>
    )
}
export default GeneratedUI