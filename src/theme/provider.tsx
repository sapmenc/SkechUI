"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {

  const [mounted,setmounted]=React.useState(false)
  React.useEffect(()=>{
    setmounted(true)
  },[])

  return (
    mounted && <NextThemesProvider {...props}>{children}</NextThemesProvider>
  )
} //this theme provider will wrap all the children components with next-themes provider