'use client'
import { addArrow, addEllipse, addFrame, addFreeDrawShape, addGeneratedUI, addLine, addRect, addText, clearSelection, FrameShape, removeShape, selectShape, setTool, Shape, Tool, updateShape } from "@/redux/slice/shapes";
import { handToolDisable, handToolEnable, panEnd, panMove, panStart, Point, screenToWorld, wheelPan, wheelZoom } from "@/redux/slice/viewport";
import { AppDispatch,useAppDispatch,useAppSelector } from "@/redux/store";
import { nanoid } from "@reduxjs/toolkit";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { number, string } from "zod";

interface TouchPointer{
    id:number
    p:Point
}
const RAF_INTERVAL_MS=8
interface DraftShape{
    type:'frame' | 'rect' | 'ellipse' | 'arrow' | 'line'
    startWorld:Point
    currentWorld:Point
}

export const useInfiniteCanvas=()=>{
    const dispatch=useDispatch<AppDispatch>()
    const viewport=useAppSelector((state)=>state.viewport)
    const entityState=useAppSelector((state)=>state.shapes.shapes)
   
    //convert the shapes state into an array so that we can render onto the screen
    const shapeList:Shape[]=entityState.ids.map((id:string)=>entityState.entities[id]).filter((s:Shape | undefined):s is Shape=>Boolean(s))
    //tool that the userr is currently using+shapes using
    const currentTool=useAppSelector((s)=>s.shapes.tool)

    const selectedShapes=useAppSelector((s)=>s.shapes.selected)
    //check sidebar is inside the viewport or not
    const [isSideBarOpen,setisSideBarOpen]=useState(false)
    const shapesEntities=useAppSelector((state)=>state.shapes.shapes.entities)
     //check any selected shapes is text based shapes or not
    const hasSelectedText=Object.keys(selectedShapes).some((id)=>{
        const shape=shapesEntities[id]
        return shape?.type==='text'
    })

    useEffect(()=>{
        if(hasSelectedText && !isSideBarOpen){
            setisSideBarOpen(true)
        }
        else if(!hasSelectedText){
            setisSideBarOpen(false)
        }
    },[hasSelectedText,setisSideBarOpen])

    const canvasRef=useRef<HTMLDivElement | null>(null)
    const touchMapRef=useRef<Map<number,TouchPointer>>(new Map())
    const draftShapeRef=useRef<DraftShape|null>(null) //this is the shape that is being drawn before it is finalized->preciew shape. later we mount that when it is successful.
    const freeDrawPointsRef=useRef<Point[]>([]) //store all the mouse touch points
    const isSpacePressed=useRef(false)
    const isDrawingRef=useRef(false) //keep track of the drawing shape
    const isMovingRef=useRef(false)// userr is moving something or not
    const moveStartRef=useRef<Point | null>(null) //kaha se movement start hua
    const initialShapesPositionRef=useRef<Record<string,{
        x?:number
        y?:number
        points?:Point[]
        startX?:number
        startY?:number
        endX?:number
        endY?:number
    }
    >
    >({}) //keep track of the initial position of the shape.for (shapes movement)
    const isErasingRef=useRef(false)
    const erasedShapesRef=useRef<Set<string>>(new Set()) //which shapes are erased
    const isResizingRef=useRef(false)
    const resizeDataRef=useRef<{
        shapeId:string,
        corner:string
        initialBounds:{x:number,y:number,w:number,h:number}
        startPoint:{x:number,y:number}
    } | null>(null) //how the shape is resized

    const lastFreehandFrameRef=useRef(0)
    const freehandRafRef=useRef<number|null>(null)
    const panRafRef=useRef<number|null>(null)
    const pendingPanPointRef=useRef<Point|null>(null)

    const [,force]=useState(0)
    const requestRender=():void=>{
        force((n)=>(n+1)|0)
    }

    //coordinate conversion helper function
    // screen cordinates -> canvas coordinates
   const localPointFromClient=(clientX:number,clientY:number):Point=>{
       const el=canvasRef.current
       if(!el){
        return {x:clientX,y:clientY}
       }
       const r=el.getBoundingClientRect()
       return {x:clientX-r.left,y:clientY-r.top}
   }
   //remove focus from already clicked elements
   const blurActiveTextInput=()=>{
     const activeElement=document.activeElement
     if(activeElement && activeElement.tagName==='INPUT'){
        (activeElement as HTMLInputElement).blur()
     }
   }
   type WithClientXY={clientX:number,clientY:number}
   //helper fucntion that invoke local points from the client
   const getLocalPointFromPtr=(e:WithClientXY):Point=>localPointFromClient(e.clientX,e.clientY)
   
   const getShapeAtPoint=(worldPoint:Point):Shape | null => {
    for(let i=shapeList.length-1;i>=0;i--){
        const shape=shapeList[i]
        if(isPointInShape(worldPoint,shape)){
            return shape
        }
    }
    return null
   }

   const isPointInShape=(point:Point,shape:Shape):boolean=>{
      switch(shape.type){
         case 'frame':
         case 'rect':
         case 'ellipse':
         case 'generatedui':
           return (
              point.x >= shape.x &&
              point.x <= shape.x + shape.w &&
              point.y >= shape.y && 
              point.y <= shape.y + shape.h
           )
         case 'freedraw':
             const threshold=5
             for(let i=0;i<shape.points.length-1;i++){
                const p1=shape.points[i]
                const p2=shape.points[i+1]
                //distance between two points
                if(distanceToLineSegment(point,p1,p2) <= threshold){
                    return true;
                }
             }
             return false
          case 'arrow':
          case 'line':
             const lineThreshold=8
             return (
                distanceToLineSegment(
                    point,
                    {x:shape.startX,y:shape.startY},
                    {x:shape.endX,y:shape.endY}
                ) <= lineThreshold
             ) 
          case 'text':
             const textWidth=Math.max(
                shape.text.length*(shape.fontSize*0.6),100
             )
             const textHeight=shape.fontSize*1.2
             const padding=8
             return (
                point.x >= shape.x-2 &&
                point.x <= shape.x + textWidth + padding + 2 &&
                point.y >= shape.y-2 &&
                point.y <= shape.y + textHeight+padding+2
             )
          default:
            return false
      }
    }
    //calculate distance from the passing point to that line
    const distanceToLineSegment=(
        point:Point,
        lineStart:Point,
        lineEnd:Point
    ):number=>{
        const A=point.x-lineStart.x
        const B=point.y-lineStart.y
        const C=lineEnd.x-lineStart.x
        const D=lineEnd.y-lineStart.y

        const dot=A*C + B*D
        const lenSq=C*C + D*D
        let param=-1
        if(lenSq !== 0){
            param=dot/lenSq
        }
        let xx,yy
        if( param < 0){
            xx=lineStart.x
            yy=lineStart.y
        }
        else if(param > 1){
            xx=lineEnd.x
            yy=lineEnd.y
        }
        else{
            xx=lineStart.x+param*C
            yy=lineStart.y+param*D
        }
        const dx=point.x-xx
        const dy=point.y-yy
        return Math.sqrt(dx*dx + dy*dy)
    }

   //set performance optimizations and animations
   const schedulePanMove=(p:Point)=>{
       pendingPanPointRef.current=p
       if(panRafRef.current != null) return
       panRafRef.current=window.requestAnimationFrame(()=>{
          panRafRef.current=null
          const next=pendingPanPointRef.current
          if(next){
            dispatch(panMove(next))
          }
       })
   } //help to move the canvas

    const freeHandTick=():void=>{
        const now=performance.now()
        if(now-lastFreehandFrameRef.current >= RAF_INTERVAL_MS){
            if(freeDrawPointsRef.current.length > 0){
                requestRender()
            }
            lastFreehandFrameRef.current=now
        }
        if(isDrawingRef.current){
            freehandRafRef.current=window.requestAnimationFrame(freeHandTick)
        }
    }
    //create the wheel events like zooming into the canvas(paning)
    const onWheel=(e:WheelEvent)=>{
        e.preventDefault()
        //get the origin screen
        const originScreen=localPointFromClient(e.clientX,e.clientY)
        //if they click on some key
        if(e.ctrlKey || e.metaKey){
            dispatch(wheelZoom({deltaY:e.deltaY,originScreen}))
        }
        else{
            const dx=e.shiftKey ? e.deltaY:e.deltaX
            const dy=e.shiftKey ? 0:e.deltaY
            dispatch(wheelPan({dx:-dx,dy:-dy}))
        }
    }
    const onPointerDown:React.PointerEventHandler<HTMLDivElement>=(e)=>{
        const target=e.target as HTMLElement
        const isButton=target.tagName==='BUTTON' || 
        target.closest('button') ||
        target.classList.contains('pointer-events-auto') || 
        target.closest('.pointer-events-auto')

        if(!isButton){
            e.preventDefault()
        }
        else{
            console.log('Not preventing default-clicked on interactive element:',target)
            return //don't handle canvas interactions when clicking buttons
        }
        const local=getLocalPointFromPtr(e.nativeEvent)
        const world=screenToWorld(local,viewport.translate,viewport.scale)
        if(touchMapRef.current.size <= 1){
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton=e.button===1 || e.button===2
            const panByShift=isSpacePressed.current && e.button===0

            if(isPanButton && panByShift){
                const mode=isSpacePressed.current?'shiftPanning':'panning'
                dispatch(panStart({screen:local,mode}))
                return
            }
            if(e.button===0){
                if(currentTool==='select'){
                    const hitShape=getShapeAtPoint(world)
                    if(hitShape){
                        const isAlreadySelected=selectedShapes[hitShape.id]
                        if(!isAlreadySelected){
                            if(!e.shiftKey){
                                dispatch(clearSelection())
                            }
                            dispatch(selectShape(hitShape.id))
                        }
                        isMovingRef.current=true
                        moveStartRef.current=world

                        initialShapesPositionRef.current={}
                        Object.keys(selectedShapes).forEach((id)=>{
                            const shape=entityState.entities[id]
                            if(shape){
                                if(
                                    shape.type==='frame' || shape.type==='rect' || shape.type==='ellipse' || shape.type==='grneratedui'
                                ){
                                    initialShapesPositionRef.current[id]={
                                        x:shape.x,
                                        y:shape.y
                                    }
                                }
                                else if(shape.type==='freedraw'){
                                    initialShapesPositionRef.current[id]={
                                        points:[...shape.points]
                                    }
                                }
                                else if(shape.type==='arrow' || shape.type==='line'){
                                    initialShapesPositionRef.current[id]={
                                        startX:shape.startX,
                                        startY:shape.startY,
                                        endX:shape.endX,
                                        endY:shape.endY
                                    }
                                }
                                else if(shape.type=='text'){
                                    initialShapesPositionRef.current[id]={
                                        x:shape.x,
                                        y:shape.y
                                    }
                                }
                            }
                        })
                        if(hitShape.type==='frame' || hitShape.type==='rect' || hitShape.type==='ellipse' || hitShape.type==='generatedui'){
                            initialShapesPositionRef.current[hitShape.id]={
                                x:hitShape.x,
                                y:hitShape.y
                            }
                        }
                        else if(hitShape.type==='freedraw'){
                            initialShapesPositionRef.current[hitShape.id]={
                                points:[...hitShape.points]
                            }
                        }
                        else if(hitShape.type==='arrow' || hitShape.type==='line'){
                            initialShapesPositionRef.current[hitShape.id]={
                                startX:hitShape.startX,
                                startY:hitShape.startY,
                                endX:hitShape.endX,
                                endY:hitShape.endY
                            }
                        }
                        else if(hitShape.type==='text'){
                            initialShapesPositionRef.current[hitShape.id]={
                                x:hitShape.x,
                                y:hitShape.y
                            }
                        }
                    }
                    else{
                        //clicked on empty space- clear selection and blur any active textinput
                        if(!e.shiftKey){
                            dispatch(clearSelection())
                            blurActiveTextInput()
                        }
                    }

                }
                else if(currentTool==='eraser'){
                    isErasingRef.current=true
                    erasedShapesRef.current.clear()
                    const hitShape=getShapeAtPoint(world)
                    if(hitShape){
                        dispatch(removeShape(hitShape.id))
                        erasedShapesRef.current.add(hitShape.id)
                    }
                    else{
                        blurActiveTextInput()
                    }
                }
                else if(currentTool==='text'){
                    dispatch(addText({x:world.x,y:world.y}))
                    dispatch(setTool('select'))
                }
                else{
                    isDrawingRef.current=true
                    if(currentTool==='frame' || currentTool==='rect' || currentTool==='ellipse' || currentTool==='arrow' || currentTool==='line'){
                        console.log('Starting to Draw:',currentTool,'at:',world)
                        draftShapeRef.current={
                            type:currentTool,
                            startWorld:world,
                            currentWorld:world
                        }
                        requestRender()
                    }
                    else if(currentTool==='freedraw'){
                        freeDrawPointsRef.current=[world]
                        lastFreehandFrameRef.current=performance.now()
                        freehandRafRef.current=window.requestAnimationFrame(freeHandTick)
                        requestRender()
                    }
                }

            }
        }
    }
    
    const onPointerMove:React.PointerEventHandler<HTMLDivElement>=(e)=>{
        const local=getLocalPointFromPtr(e.nativeEvent)
        const world=screenToWorld(local,viewport.translate,viewport.scale)

        if(viewport.mode==='panning' || viewport.mode==='shiftPanning'){
            schedulePanMove(local)
            return
        }
        if(isErasingRef.current && currentTool==='eraser'){
            const hitShape=getShapeAtPoint(world)
            if(hitShape && !erasedShapesRef.current.has(hitShape.id)){
                //delete the shape if we haven't already deleted it in this drag
                dispatch(removeShape(hitShape.id))
                erasedShapesRef.current.add(hitShape.id)
            }
        }
        //shapemovement
        if(isMovingRef.current && moveStartRef.current && currentTool==='select'){
            const deltaX=world.x-moveStartRef.current.x
            const deltaY=world.y-moveStartRef.current.y
            Object.keys(initialShapesPositionRef.current).forEach((id)=>{
                const initialPos=initialShapesPositionRef.current[id]
                const shape=entityState.entities[id]
                if(shape && initialPos){
                    if(shape.type==='frame' || shape.type==='rect' || shape.type==='ellipse' || shape.type==='text' || shape.type==='generateui'){
                        if(typeof initialPos.x==='number' && typeof initialPos.y==='number'){
                            dispatch(updateShape({
                               id,
                               patch:{
                                 x:initialPos.x+deltaX,
                                 y:initialPos.y+deltaY
                               },
                            }))
                        }
                    }

                }
                else if(shape.type==='freedraw'){
                    const initialPoints=initialPos.points
                    if(initialPoints){
                        const newPoints=initialPoints.map((point)=>({
                            x:point.x+deltaX,
                            y:point.y+deltaY
                        }))
                        dispatch(updateShape({
                            id,
                            patch:{
                                points:newPoints
                            },
                        }))
                    }
                }
                else if(shape.type==='arrow' || shape.type==='line'){
                    if(
                        typeof initialPos.startX==='number' && typeof initialPos.startY==='number' && typeof initialPos.endX==='number' && typeof initialPos.endY==='number'
                    ){
                        dispatch(
                            updateShape({
                                id,
                                patch:{
                                    startX:initialPos.startX+deltaX,
                                    startY:initialPos.startY+deltaY,
                                    endX:initialPos.endX+deltaX,
                                    endY:initialPos.endY+deltaY
                                }
                            })
                        )
                    }
                }

            })
        }
       if(isDrawingRef.current){
          if(draftShapeRef.current){
            draftShapeRef.current.currentWorld=world
            requestRender()
          }
          else if(currentTool==='freedraw'){
            freeDrawPointsRef.current.push(world)
          }
       }
    }
    //convert draft shapes into real shapes
    const finalizeDrawingIfAny=():void=>{
        if(!isDrawingRef.current){
            return
        }
        isDrawingRef.current=false
        if(freehandRafRef.current){
            window.cancelAnimationFrame(freehandRafRef.current)
            freehandRafRef.current=null
        }
        const draft=draftShapeRef.current
        if(draft){
            const x=Math.min(draft.startWorld.x,draft.currentWorld.x)
            const y=Math.min(draft.startWorld.y,draft.currentWorld.y)
            const w=Math.abs(draft.currentWorld.x-draft.startWorld.x)
            const h=Math.abs(draft.currentWorld.y-draft.startWorld.y)
            if(w>1 && h>1){
                if(draft.type==='frame'){
                    console.log('Adding Frame Shape:',{x,y,w,h})
                    dispatch(addFrame({x,y,w,h}))
                }
                else if(draft.type==='rect'){
                    dispatch(addRect({x,y,w,h}))
                }
                else if(draft.type==='ellipse'){
                    dispatch(addEllipse({x,y,w,h}))
                }
                else if(draft.type==='arrow'){
                    dispatch(addArrow({
                        startX:draft.startWorld.x,
                        startY:draft.startWorld.y,
                        endX:draft.currentWorld.x,
                        endY:draft.currentWorld.y
                    }))
                }
                else if(draft.type==='line'){
                    dispatch(addLine({
                        startX:draft.startWorld.x,
                        startY:draft.startWorld.y,
                        endX:draft.currentWorld.x,
                        endY:draft.currentWorld.y
                    }))
                }
            }
            draftShapeRef.current=null
        }
        else if(currentTool==='freedraw'){
            const pts=freeDrawPointsRef.current
            if(pts.length > 1){
                dispatch(addFreeDrawShape({points:pts}))
            }
            freeDrawPointsRef.current=[]
        }
        requestRender()
    }
    const onPointerUp:React.PointerEventHandler<HTMLDivElement>=(e)=>{
        canvasRef.current?.releasePointerCapture?.(e.pointerId)
        if(viewport.mode==='panning' || viewport.mode==='shiftPanning'){
            dispatch(panEnd())
        }
        if(isMovingRef.current){
            isMovingRef.current=false
            moveStartRef.current=null
            initialShapesPositionRef.current={}
        }
        if(isErasingRef.current){
            isErasingRef.current=false
            erasedShapesRef.current.clear()
        }
        finalizeDrawingIfAny()
    }
    const onPointerCancel:React.PointerEventHandler<HTMLDivElement>=(e)=>{
        onPointerUp(e)
    }
    const onKeyDown=(e:KeyboardEvent):void=>{
        if((e.code==='ShiftLeft' || e.code==='ShiftRight') && !e.repeat){
            e.preventDefault()
            isSpacePressed.current=true
            dispatch(handToolEnable())
        }
    }
    const onKeyUp=(e:KeyboardEvent):void=>{
        if(e.code==='ShiftLeft' || e.code==='ShiftRight'){
            e.preventDefault()
            isSpacePressed.current=false
            dispatch(handToolDisable())
        }
    }

    useEffect(()=>{
        document.addEventListener('keydown',onKeyDown)
        document.addEventListener('keyup',onKeyUp)
        return ()=>{
            document.removeEventListener('keydown',onKeyDown)
            document.removeEventListener('keyup',onKeyUp)
            if(freehandRafRef.current){
                window.cancelAnimationFrame(freehandRafRef.current)
            }
            if(panRafRef.current){
                window.cancelAnimationFrame(panRafRef.current)
            }
        }
    },[])

    useEffect(()=>{
       const handleResizeStart=(e:CustomEvent)=>{
          const {shapeId,corner,bounds}=e.detail
          isResizingRef.current=true
          resizeDataRef.current={
             shapeId,
             corner,
             initialBounds:bounds,
             startPoint:{x:e.detail.clientX || 0, y:e.detail.clientY || 0},
          }
       }
       const handleResizeMove=(e:CustomEvent)=>{
          if(!isResizingRef.current || !resizeDataRef.current){
            return
          }
          const {shapeId,corner,initialBounds}=resizeDataRef.current
          const {clientX,clientY}=e.detail

          const canvasEl=canvasRef.current
          if(!canvasEl){
            return
          }
          const rect=canvasEl.getBoundingClientRect()
          const localX=clientX-rect.left
          const localY=clientY-rect.top
          const world=screenToWorld({
            x:localX,y:localY
          },viewport.translate,viewport.scale)

          const shape=entityState.entities[shapeId]
          if(!shape){
            return
          }
          const newBounds={...initialBounds}
          switch(corner){
             case 'nw':
                newBounds.w=Math.max(10,initialBounds.w+(initialBounds.x-world.x))
                newBounds.h=Math.max(10,initialBounds.h+(initialBounds.y-world.y))
                newBounds.x=world.x
                newBounds.y=world.y
                break
             case 'ne':
                newBounds.w=Math.max(10,world.x-initialBounds.x)
                newBounds.h=Math.max(10,initialBounds.h+(initialBounds.y-world.y))
                newBounds.y=world.y
                break
             case 'sw':
                newBounds.w=Math.max(
                    10,
                    initialBounds.w+(initialBounds.x-world.x)
                )
                newBounds.h=Math.max(10,world.y-initialBounds.y)
                newBounds.x=world.x
                break
             case 'se':
                newBounds.w=Math.max(10,world.x-initialBounds.x)
                newBounds.h=Math.max(10,world.y-initialBounds.y)
                break
          }

          if(shape.type==='frame' || shape.type==='rect' || shape.type==='ellipse'){
             dispatch(
                updateShape({
                    id:shapeId,
                    patch:{
                        x:newBounds.x,
                        y:newBounds.y,
                        w:newBounds.w,
                        h:newBounds.h,
                    },
                })
             )
          }
          else if(shape.type==='freedraw'){
              const xs=shape.points.map((p:{x:number,y:number})=>p.x)
              const ys=shape.points.map((p:{x:number,y:number})=>p.y)
              const actualMinX=Math.min(...xs)
              const actualMaxX=Math.max(...xs)
              const actualMinY=Math.min(...ys)
              const actualMaxY=Math.max(...ys)
              const actualWidth=actualMaxX-actualMinX
              const actualHeight=actualMaxY-actualMinY

              const newActualX=newBounds.x+5
              const newActualY=newBounds.y+5
              const newActualWidth=Math.max(10,newBounds.w-10)
              const newActualHeight=Math.max(10,newBounds.h-10)

              const scaleX=actualWidth > 0 ? newActualWidth/actualWidth : 1
              const scaleY=actualHeight > 0 ?newActualHeight / actualHeight : 1

              const scaledPoints=shape.points.map((point:{x:number,y:number})=>({
                x:newActualX+(point.x-actualMinX)*scaleX,
                y:newActualY+(point.y-actualMinY)*scaleY
              }))
              dispatch(
                updateShape({
                    id:shapeId,
                    patch:{
                        points:scaledPoints
                    },
                })
              )
          }
          else if(shape.type==='line' || shape.type==='arrow'){
            const actualMinX=Math.min(shape.startX,shape.endX)
            const actualMaxX=Math.max(shape.startX,shape.endX)
            const actualMinY=Math.min(shape.startY,shape.endY)
            const actualMaxY=Math.max(shape.startY,shape.endY)
            const actualWidth=actualMaxX-actualMinX
            const actualHeight=actualMaxY-actualMinY

            const newActualX=newBounds.x+5;
            const newActualY=newBounds.y+5
            const newActualWidth=Math.max(10,newBounds.w-10)
            const newActualHeight=Math.max(10,newBounds.h-10)

            let newStartX,newStartY,newEndX,newEndY
            if(actualWidth===0){
                newStartX=newActualX+newActualWidth/2

                newEndX=newActualX+newActualWidth/2

                newStartY=shape.startY < shape.endY ? newActualY:newActualY+newActualHeight

                newEndY=shape.startY < shape.endY ? newActualY+newActualHeight : newActualY
            }
            else if(actualHeight===0){
                //only the width will change
                newStartY=newActualY+newActualHeight/2

                newEndY=newActualY+newActualHeight/2

                newStartX=shape.startX < shape.endX ? newActualX : newActualX + newActualWidth

                newEndX=shape.startX < shape.endX ? newActualX + newActualWidth : newActualX
            }
            else{
                const scaleX=newActualWidth/actualWidth
                const scaleY=newActualHeight/actualHeight

                newStartX=newActualX + (shape.startX - actualMinX)*scaleX
                newStartY=newActualY+(shape.startY - actualMinY)*scaleY
                newEndX=newActualX+(shape.endX-actualMinX)*scaleX
                newEndY=newActualY+(shape.endY-actualMinY)*scaleY
            }

            dispatch(updateShape({
                id:shapeId,
                patch:{
                    startX:newStartX,
                    startY:newStartY,
                    endX:newEndX,
                    endY:newEndY
                },
            }))
          }
        }
        const handleResizeEnd=()=>{
            isResizingRef.current=false
            resizeDataRef.current=null
        }
        window.addEventListener('shape-resize-start',handleResizeStart as EventListener)
        window.addEventListener('shape-resize-move',handleResizeMove as EventListener)
        window.addEventListener('shape-resize-end',handleResizeEnd as EventListener)

        return ()=>{
            window.removeEventListener('shape-resize-start',handleResizeStart as EventListener)
            window.removeEventListener('shape-resize-move',handleResizeMove as EventListener)
            window.removeEventListener('shape-resize-end',handleResizeEnd as EventListener)
        }
    },[
        dispatch,
        entityState.entities,
        viewport.translate,
        viewport.scale,
    ])

    const attachCanvasRef=(ref:HTMLDivElement | null):void=>{
        //Clean up any existing event listenersw on the old canvas
        if(canvasRef.current){
             canvasRef.current.removeEventListener('wheel',onWheel)
        }
        //store the new canvas reference
        canvasRef.current=ref

        //Add wheel event listener to the new canvas(for zoom/pan)
        if(ref){
            ref.addEventListener('wheel',onWheel,{passive:false})
        }
    }

    const selectTool=(tool:Tool):void=>{
        dispatch(setTool(tool))
    }
    const getDraftShape=():DraftShape | null => draftShapeRef.current
    const getFreeDrawPoints=():ReadonlyArray<Point>=>freeDrawPointsRef.current

    return {
        viewport,
        shape:shapeList,
        currentTool,
        selectedShapes,

        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,

        attachCanvasRef,
        selectTool,
        getDraftShape,
        getFreeDrawPoints,
        isSideBarOpen,
        hasSelectedText,
        setisSideBarOpen
    }
}

export const isShapeInsideFrame=(
    shape:Shape,
    frame:FrameShape
):boolean =>{
    const frameLeft=frame.x
    const frameTop=frame.y
    const frameRight=frame.x+frame.w
    const frameBottom=frame.y+frame.h

    switch(shape.type){
        case 'rect':
        case 'ellipse':
        case 'frame':
            //Check is shape center point is within frame
            const centerX=shape.x+shape.w/2
            const centerY=shape.y+shape.h/2
            return (
                centerX >= frameLeft &&
                centerX <= frameRight &&
                centerY >= frameTop &&
                centerY <= frameBottom
            )
        case 'text':
            //check if text position is within frame
            return (
                shape.x >= frameLeft &&
                shape.x <= frameRight &&
                shape.y >= frameTop &&
                shape.y <= frameBottom
            )
        case 'freedraw':
            //check if any drawing points are within frame
            return shape.points.some(
                (point)=>
                    point.x >= frameLeft &&
                    point.x <= frameRight &&
                    point.y >= frameTop &&
                    point.y <= frameBottom
            )
        case 'line':
        case 'arrow':
            //check either start or end point is within frame
            const startInside=
                shape.startX >= frameLeft &&
                shape.startX <= frameRight &&
                shape.startY >= frameTop &&
                shape.startY <= frameBottom
            const endInside=
                shape.endX >= frameLeft &&
                shape.endX <= frameRight &&
                shape.endY >= frameTop &&
                shape.endY <= frameBottom
            return startInside || endInside
        default:
            return false
    }
}

export const getShapesInsideFrame=(
    shapes:Shape[],
    frame:FrameShape
):Shape[]=>{
    //Single Corordinate based detection : find shapes within frame bounds
    const shapesInFrame=shapes.filter((shape)=>shape.id !== frame.id && isShapeInsideFrame(shape,frame))

    // console.log(`Frame ${frame.frameNumber} capture`,{
    //     totalShapes:shapes.length,
    //     captured:shapesInFrame.length,
    //     capturedTypes:shapesInFrame.map((s)=>s.type)
    // })
    return shapesInFrame
}

const renderShapeOnCanvas=(
    ctx:CanvasRenderingContext2D,
    shape:Shape,
    frameX:number,
    frameY:number
)=>{
   ctx.save()
   switch(shape.type){
      case 'rect':
      case 'ellipse':
      case 'frame':
        const relativeX=shape.x-frameX
        const relativeY=shape.y-frameY
        if(shape.type==='rect' || shape.type==='frame'){
            //render rounded rectangles and frames
            ctx.strokeStyle=shape.stroke && shape.stroke !=='transparent' ? shape.stroke : '#ffffff'
            ctx.lineWidth=shape.strokeWidth || 2

            const borderRadius=shape.type==='rect'?8:0
            ctx.beginPath()
            ctx.roundRect(relativeX,relativeY,shape.w,shape.h,borderRadius)
            ctx.stroke()
        }
        else if(shape.type==='ellipse'){
            //render only the border and the strokes
            ctx.strokeStyle=shape.stroke && shape.stroke !== 'transparent'?shape.stroke : '#ffffff'

            ctx.lineWidth=shape.strokeWidth || 2
            ctx.beginPath()
            ctx.ellipse(
                relativeX+shape.w/2,
                relativeY+shape.h/2,
                shape.w/2,
                shape.h/2,
                0,
                0,
                2*Math.PI
            )
            ctx.stroke()
        }
        break
      case 'text':
        const textRelativeX=shape.x-frameX
        const textRelativeY=shape.y-frameY
        ctx.fillStyle=shape.fill || '#ffffff'
        ctx.font=`${shape.fontSize}px ${shape.fontFamily || 'Inter, sans-serif'}`
        ctx.textBaseline='top'
        ctx.fillText(shape.text,textRelativeX,textRelativeY)
        break
      case 'freedraw':
        if(shape.points.length > 1){
            ctx.strokeStyle=shape.stroke || '#ffffff'
            ctx.lineWidth=shape.strokeWidth || 2
            ctx.lineCap='round'
            ctx.lineJoin='round'
            ctx.beginPath()
            const firstPoint=shape.points[0]
            ctx.moveTo(firstPoint.x-frameX,firstPoint.y-frameY)
            for(let i=1;i<shape.points.length;i++){
               const point=shape.points[i]
               ctx.lineTo(point.x-frameX,point.y-frameY)
            }
            ctx.stroke()
        }
        break
      case 'line':
        ctx.strokeStyle=shape.stroke || '#ffffff'
        ctx.lineWidth=shape.strokeWidth || 2
        ctx.beginPath()
        ctx.moveTo(shape.startX-frameX,shape.startY-frameY)
        ctx.lineTo(shape.endX-frameX,shape.endY-frameY)
        ctx.stroke()
        break
      case 'arrow':
        ctx.strokeStyle=shape.stroke || '#ffffff'
        ctx.lineWidth=shape.strokeWidth || 2
        ctx.beginPath()
        ctx.moveTo(shape.startX-frameX,shape.startY-frameY)
        ctx.lineTo(shape.endX-frameX,shape.endY-frameY)
        ctx.stroke()
        
        const headLength=10
        const angle=Math.atan2(
            shape.endY-shape.startY,
            shape.endX-shape.startX
        )
        ctx.fillStyle=shape.stroke || '#ffffff'
        ctx.beginPath()
        ctx.moveTo(shape.endX-frameX,shape.endY-frameY)
        ctx.lineTo(
            shape.endX-frameX-headLength*Math.cos(angle-Math.PI/6),
            shape.endY-frameY-headLength*Math.sin(angle-Math.PI/6)
        )
        ctx.lineTo(
            shape.endX-frameX-headLength*Math.cos(angle+Math.PI/6),
            shape.endY-frameY-headLength*Math.sin(angle+Math.PI/6)
        )
        ctx.closePath()
        ctx.fill()
        break
   }
   ctx.restore()
}

const generateFrameSnapshot=async(
    frame:FrameShape,
    allShapes:Shape[]
):Promise<Blob>=>{
     //get all of the shapes inside frame
     const shapesInFrame=getShapesInsideFrame(allShapes,frame)
     //grab the canvas
     const canvas=document.createElement('canvas')
     canvas.width=frame.w
     canvas.height=frame.h
     const ctx=canvas.getContext('2d')
     if(!ctx){
        throw new Error('Failed to get canvas context')
     }
     //set background of all the elements to black
     ctx.fillStyle='#000000'
     ctx.fillRect(0,0,canvas.width,canvas.height)
     ctx.save()
     ctx.beginPath()
     ctx.rect(0,0,canvas.width,canvas.height)
     ctx.clip()
     //render each of the shapes within the canvas
     shapesInFrame.forEach((shape)=>{
        renderShapeOnCanvas(ctx,shape,frame.x,frame.y)
     })
     ctx.restore()
     console.log('All Shapes rendered')

     //convert the canvas itself into a blob
     return new Promise((resolve,reject)=>{
        canvas.toBlob((blob)=>{
            if(blob){
                resolve(blob)
            }
            else{
                reject(new Error('Failed to create image blob'))
            }
        },
        'image/png',
        1.0
    )
     })
}

export const downloadBlob=(blob:Blob,filename:string):void=>{
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url
    link.download=filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

//create a frame-> export all the designs inside the frame into an image -> AI Api -> generate the UI-> added to canvas
export const useFrame=(shape:FrameShape)=>{
    const dispatch=useAppDispatch()
   const [isGenerating, setIsGenerating]=useState(false)
   //we need all the shapes
   const allShapes=useAppSelector((state)=>Object.values(state.shapes.shapes?.entities || {}).filter(
     (shape):shape is Shape=>shape !== undefined
   ))
   const handleGenerateDesign=async()=>{
    //convert frame into real UI design
     try {
       setIsGenerating(true)
       const snapshot=await generateFrameSnapshot(shape,allShapes)
       //download the blob
       downloadBlob(snapshot,`frame-${shape.frameNumber}-snapshot.png`)
       //create formdata append the image link into the form data

      const formData=new FormData()
      formData.append('image',snapshot,`frame-${shape.frameNumber}.png`)
      formData.append('frameNumber',shape.frameNumber.toString())

       //add the project context
       const urlParams=new URLSearchParams(window.location.search)
       const projectId=urlParams.get('project')
       if(projectId){
          formData.append('projectId',projectId)
       }
       //send the response to ai
       const response=await fetch('/api/generate',{
        method:'POST',
        body:formData
       })
       if(!response.ok){
         const errorText=await response.text()
         throw new Error(
            `Api request failed:${response.status} ${response.statusText}-${errorText}`
         )
       }
       //generate ui position. place this ui next to the frame
       const generatedUIPosition={
        x:shape.x + shape.w + 50, //50px spacing from frame
        y:shape.y,
        w:Math.max(400,shape.w), //atleast 400px widr or frame width if larger
        h:Math.max(300,shape.h) //at least 300px high or frame height if larger
       }

       const generatedUIId=nanoid()

       dispatch(
        addGeneratedUI({
            ...generatedUIPosition,
            id:generatedUIId,
            uiSpecData:null, //start with null for live rendering
            sourceFrameId:shape.id
        })
       )

       //stream the response
       //TODO-> save the generation in the background continuously
       const reader=response.body?.getReader()
       const decoder=new TextDecoder()
       let accumulatedMarkup=''

       let lastUpdateTime=0
       const UPDATE_THROTTLE_MS=200

       if(reader){
         try {
            while(true){
                const {done,value}=await reader.read()
                if(done){
                    //update with final accumulated markup
                    dispatch(
                        updateShape({
                            id:generatedUIId,
                            patch:{uiSpecData:accumulatedMarkup}
                        })
                    )
                    break
                }
                const chunk=decoder.decode(value)
                accumulatedMarkup+=chunk

                const now=Date.now()
                if(now-lastUpdateTime >= UPDATE_THROTTLE_MS){
                    dispatch(
                        updateShape({
                            id:generatedUIId,
                            patch:{uiSpecData:accumulatedMarkup}
                        })
                    )
                    lastUpdateTime=now
                }
            }
         } finally{
            reader.releaseLock()
         }
       }
     } catch (error) {
        toast.error(`Failed to generate UI Design : ${error instanceof Error ? error.message : 'Unknown Error'}`)
     } finally{
        setIsGenerating(false)
     }
   }
   return {
    isGenerating,
    handleGenerateDesign
   }
}

