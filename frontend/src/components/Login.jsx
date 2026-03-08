import React, { useEffect, useState } from 'react'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import axios from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice.js'

const Login = () => {
    const [input, setInput] = useState({
        email: "",
        password: ""
    })

    const { user } = useSelector(store => store.auth)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    // Input Change Handler
    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value })
    }

    // login form submit handler
    const loginHandler = async (e) => {
        e.preventDefault()

        // ✅ Custom validation
        if (!input.email.trim() || !input.password.trim()) {
            toast.error("Please fill all the fields!");
            return; // form submit nahi hoga
        }
        try {
            setLoading(true)
            const res = await axios.post('http://localhost:8000/api/v1/user/login', input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            })
            if (res.data.success) {
                dispatch(setAuthUser(res.data.user))
                navigate("/")
                toast.success(res.data.message || "Login Successfully...!")
                setInput({
                    email: "",
                    password: ""
                })
            }
        } catch (error) {
            console.log("login error", error)
            toast.error(error.response.data.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            navigate("/")
        }
    }, [])

    return (
        <div className='flex items-center w-screen h-screen justify-center'>
            <form onSubmit={loginHandler} className='shadow-lg flex flex-col gap-5 p-8'>
                <div className='my-4 '>
                    <h1 className='text-center font-bold text-xl'>Sign In</h1>
                    <p className='text-sm text-center mt-2'>Signin to see photos & videos from your friends</p>
                </div>

                {/* Input Fields */}

                <div>
                    <Label className="font-medium">Email</Label>
                    <Input
                        type="email"
                        name="email"
                        value={input.email}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2"
                        required
                    />
                </div>
                <div>
                    <Label className="font-medium">Password</Label>
                    <Input
                        type="password"
                        name="password"
                        value={input.password}
                        onChange={changeEventHandler}
                        className="focus-visible:ring-transparent my-2"
                        required
                    />
                </div>
                <Button type="submit">
                    {
                        loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please Wait
                            </>
                        ) : "Signin"
                    }
                </Button>
                <span className='text-center'>Don't have an account ? <Link to="/signup" className='text-blue-800'>Sign up</Link></span>
            </form>
        </div>
    )
}

export default Login