'use client'
import { useGlobalChat, useInfiniteCanvas } from "@/hooks/use-canvas";
import React from "react";
import TextSideBar from "./textsidebar";
import { cn } from "@/lib/utils";
import { ShapeRenderer } from "./shapes";
import { RectanglePreview } from "./shapes/rectangle/preview";
import { FramePreview } from "./shapes/frame/preview";
import { ElipsePreview } from "./shapes/elipse/preview";
import { ArrowPreview } from "./shapes/arrow/preview";
import { LinePreview } from "./shapes/line/preview";
import { FreeDrawStrokePreview } from "./shapes/stroke/preview";
import { SelectionOverlay } from "./shapes/selection";
import { useInspiration } from "@/hooks/use-canvas";
import InspirationSidebar from "./shapes/inspiration-sidebar";
import ChatWindow from "./shapes/generatedui/chat";
type Props={}

const InfiniteCanvas=(props:Props)=>{
    const {
        viewport,
        shape,
        currentTool,
        selectedShapes,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        attachCanvasRef,
        getDraftShape,
        getFreeDrawPoints,
        isSideBarOpen,
        hasSelectedText,
    }=useInfiniteCanvas()


    const {isChatOpen,activeGeneratedUIId,generateWorkflow,exportDesign,closeChat,
        toggleChat
    }=useGlobalChat()

    const {isInspirationOpen,closeInspiration,toggleInspiration}=useInspiration()

    

    const draftShape=getDraftShape()
    const freeDrawPoints=getFreeDrawPoints()
    return (
        <>
         <TextSideBar isOpen={isSideBarOpen && hasSelectedText}/>
         <InspirationSidebar
         isOpen={isInspirationOpen}
         onClose={closeInspiration}/>
         {/* chat window */}

         {
            activeGeneratedUIId && (
                <ChatWindow
                generatedUIId={activeGeneratedUIId}
                isOpen={isChatOpen}
                onClose={closeChat}
                />
            )
         }

         <div ref={attachCanvasRef}
         role="application"
         aria-label="Infinite Drawing Canvas"
         className={cn(
            'relative w-full h-full overflow-hidden select-none z-0',
            {
                'cursor-grabbing':viewport.mode==='panning',
                'cursor-grab':viewport.mode==='shiftPanning',
                'cursor-crosshair':currentTool !=='select' && viewport.mode==='idle',
                'cursor-default':currentTool==='select' && viewport.mode==='idle'
            }
         )}
         style={{
            touchAction:'none'
         }}
         onPointerDown={onPointerDown}
         onPointerMove={onPointerMove}
         onPointerUp={onPointerUp}
         onPointerCancel={onPointerCancel}
         onContextMenu={(e)=>e.preventDefault()}
         draggable={false}>
        <div className="absolute origin-top-left pointer-events-none z-10"
        style={{
            transform:`translate3d(${viewport.translate.x}px, ${viewport.translate.y}px,0) scale(${viewport.scale})`,
            transformOrigin:'0 0',
            willChange:'transform',
        }}>
            {
                shape.map((s)=>(
                   <ShapeRenderer
                   key={s.id}
                   shape={s}
                   toggleInspiration={toggleInspiration}
                   toggleChat={toggleChat}
                   generateWorkFlow={generateWorkflow}
                   exportDesign={exportDesign}
                   />
                ))
            }

            {/* selection overlay */}
            {shape.map((s)=>(
                <SelectionOverlay
                key={`selection-${s.id}`}
                shape={s}
                isSelected={!!selectedShapes[s.id]}/>
            ))}

            {
                draftShape && draftShape.type==='frame' && (
                    <FramePreview
                    startWorld={draftShape.startWorld}
                    currentWorld={draftShape.currentWorld}/>
                )
            }

            {
                draftShape && draftShape.type==='rect' && (
                    <RectanglePreview
                    startWorld={draftShape.startWorld}
                    currentWorld={draftShape.currentWorld}/>
                )
            }

            {
                draftShape && draftShape.type==='ellipse' && (
                    <ElipsePreview
                    startWorld={draftShape.startWorld}
                    currentWorld={draftShape.currentWorld}/>
                )
            }

            {
                draftShape && draftShape.type==='arrow' && (
                    <ArrowPreview
                    startWorld={draftShape.startWorld}
                    currentWorld={draftShape.currentWorld}/>
                )
            }

            {
                draftShape && draftShape.type==='line' && (
                    <LinePreview
                    startWorld={draftShape.startWorld}
                    currentWorld={draftShape.currentWorld}/>
                )
            }
            {
                currentTool==='freedraw' && freeDrawPoints.length > 1 && (
                    <FreeDrawStrokePreview points={freeDrawPoints}/>
                )
            }
        </div>
         </div>
        </>
    )
}
export default InfiniteCanvas