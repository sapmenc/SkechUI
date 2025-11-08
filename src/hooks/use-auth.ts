'use client';
import {useAuthActions} from "@convex-dev/auth/react"
// import { useRouter } from "next/router"
import { redirect } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z} from "zod"
import {zodResolver} from "@hookform/resolvers/zod"
// import { handler } from "next/dist/build/templates/app-page";

const signInSchema=z.object({
    email:z.string().email("Invalid email address"),
    password:z.string().min(6,"Password must be at least 6 characters long")
})
const signUpSchema=z.object({
    firstname:z.string().min(2,"First name must be at least 2 characters long"),
    lastname:z.string().min(2,"Last name must be at least 2 characters long"),
    email:z.string().email("Invalid email address"),
    password:z.string().min(6,"Password must be at least 6 characters long")
})

type signInData=z.infer<typeof signInSchema>
type signUpData=z.infer<typeof signUpSchema>

export const useAuth=()=>{
    const {signIn,signOut}=useAuthActions()
    // const router=useRouter();
    const [isloading,setisloading]=useState(false)
    const signInForm=useForm<signInData>({
        resolver:zodResolver(signInSchema),
        defaultValues:{ 
            email:"",   
            password:""
        }
    })
    const signUpForm=useForm<signUpData>({
        resolver:zodResolver(signUpSchema), //resolves the schema data to form data
        defaultValues:{
            firstname:"",
            lastname:"",
            email:"",
            password:""
        }
    })
     //create handler for sign in and signup
     const handleSignIn=async(data:signInData)=>{
        setisloading(true)
        try {
            await signIn("password",{
                email:data.email,
                password:data.password,
                flow:"signIn"
            })
            redirect('/dashboard')
        } catch (error) {
            console.log(error);
            signInForm.setError("password",{message:"Invalid email or password"})
        }
        finally{
            setisloading(false)
        }
     }
     const handleSignUp=async(data:signUpData)=>{
        setisloading(true);
        try {
            await signIn("password",{
                email:data.email,
                password:data.password,
                name:`${data.firstname} ${data.lastname}`,
                flow:"signUp"
            })
            redirect('/dashboard')
        } catch (error) {
            console.log("SignUp error : ",error);
            signUpForm.setError("root",{message:"User already exists with this email"})
        }
        finally{
            setisloading(false)
        }
     }
     const handleSignOut=async()=>{
        try {
            await signOut();
            redirect('/auth/sign-in')
        } catch (error) {
            console.log("SignOut error : ",error);
        }
     }
     return {
        signInForm,
        signUpForm,
        handleSignIn,
        handleSignUp,
        handleSignOut,
        isloading
     }
}

//useform -> validation of form