import { downloadBlob } from '@/hooks/use-canvas'



const captureVisualContent=async(
    ctx:CanvasRenderingContext2D,
    contentDiv:HTMLElement,
    width:number,
    height:number
)=>{
    const {toPng}=await import('html-to-image')
    const dataUrl=await toPng(contentDiv,{
        width:width,
        height:height,
        backgroundColor:'#ffffff',
        pixelRatio:1,
        cacheBust:true,
        includeQueryParams:false,
        skipAutoScale:true,
        skipFonts:true,
        filter:(node)=>{
            if(node.nodeType===Node.TEXT_NODE){
                return true
            }
            if(node.nodeType===Node.ELEMENT_NODE){
                const element=node as Element
                return ![
                    'SCRIPT',
                    'STYLE',
                    'BUTTON',
                    'INPUT',
                    'SELECT',
                    'TEXTAREA'
                ].includes(element.tagName)
            }
            return true
        }
    })
    //create and image from data url
    const img=new Image()
    await new Promise((resolve,reject)=>{
        img.onload=()=>{
            ctx.drawImage(img,0,0,width,height)
            console.log('Visual content captured successfully')
            resolve(void 0)
        }
        img.onerror=()=>{
            reject(new Error('Failed to load image from data URL'))
        }
        img.src=dataUrl
    })
}

export const exportGeneratedUIAsPNG=async(
    element:HTMLElement,
    filename:string
)=>{
    try {
        const rect=element.getBoundingClientRect()
        const canvas=document.createElement('canvas')
        canvas.width=rect.width
        canvas.height=rect.height
        const ctx=canvas.getContext('2d')
        if(!ctx) throw new Error('Could not get canvas context')
        ctx.fillStyle='#ffffff'
        ctx.fillRect(0,0,canvas.width,canvas.height)
         
        const contentDiv=element.querySelector('div[style*="pointer-events:auto"]') as HTMLElement

        if(contentDiv){
            console.log('Found content div, capturing visual content')
            //Capture the visual content exactly as it appears
            await captureVisualContent(ctx,contentDiv,rect.width,rect.height)
        }
        else{
            throw new Error('No content div found for export')
        }

        //convert canvas to blob for download
        canvas.toBlob(
            (blob)=>{
                if(blob){
                    console.log('GeneratedUI snapshot created successfully:',{
                     size:blob.size,
                     type:blob.type,
                     filename,
                    })
                    downloadBlob(blob,filename)
                }
                else{
                    console.error('Failed to create blob from canvas')
                }
            },
            'image/png',
            1.0
        )
    } catch (error) {
        console.error('Failed to capture generated UI snapshot:',error)
        const {toast}=await import('sonner')
        toast.error('Failed to export generated UI as PNG.')
        throw error
    }
}