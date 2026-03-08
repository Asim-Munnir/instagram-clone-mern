import React, { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { setAuthUser } from '@/redux/authSlice'

const EditProfile = () => {
    const imageRef = useRef()
    const { user } = useSelector(store => store.auth)
    const [loading, setLoading] = useState(false)

    const [input, setInput] = useState({
        profilePhoto: user?.profilePicture,
        bio: user?.bio,
        gender: user?.gender
    })

    const navigate = useNavigate()
    const dispatch = useDispatch()

    const fileChangeHandler = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setInput({ ...input, profilePhoto: file })
        }
    }

    const selectChangeHandler = (value) => {
        setInput({ ...input, gender: value })
    }


    // handle edit profile function
    const handleEditProfile = async () => {
        const formData = new FormData()
        formData.append("bio", input.bio)
        formData.append("gender", input.gender)
        if (input?.profilePhoto) {
            formData.append("profilePicture", input?.profilePhoto)
        }
        try {
            setLoading(true)
            const res = await axios.post('http://localhost:8000/api/v1/user/profile/edit', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            })
            if (res.data.success) {
                const updatedUserData = {
                    ...user,
                    bio: res.data.user?.bio,
                    profilePicture: res.data.user?.profilePicture,
                    gender: res.data.user?.gender
                }
                dispatch(setAuthUser(updatedUserData))
                navigate(`/profile/${user?._id}`)
                toast.success(res.data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.res.data.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='flex max-w-2xl mx-auto pl-10'>
            <section className=' flex flex-col gap-6 w-full my-8'>
                <h1 className='font-bold text-xl'>Edit Profile</h1>

                <div className='flex items-center justify-between bg-gray-100 rounded-xl p-4'>
                    <div className='flex items-center gap-3'>
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={input?.profilePhoto} />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className='font-bold text-sm'>
                                {user?.username.charAt(0).toUpperCase() + user?.username.slice(1).toLowerCase()}
                            </h1>
                            <div className='flex gap-5'>
                                <span className='text-gray-600 text-sm'>{user?.bio || "Bio here..."}</span>
                            </div>
                        </div>
                    </div>

                    <input ref={imageRef} type="file" className='hidden' onChange={fileChangeHandler} />
                    <Button onClick={() => imageRef.current.click()} className="bg-[#0095F6] h-8 hover:bg-[#318bc7]">Change photo</Button>
                </div>

                <div>
                    <h1 className='font-bold text-xl mb-2'>Bio</h1>
                    <Textarea value={input?.bio} onChange={(e) => setInput({ ...input, bio: e.target.value })} name="bio" className="focus-visible:ring-transparent" />
                </div>

                <div>
                    <h1 className='font-bold text-xl mb-2'>Gender</h1>
                    <Select defaultValue={input.gender} onValueChange={selectChangeHandler}>
                        <SelectTrigger className="w-full focus-visible:ring-transparent">
                            <SelectValue placeholder="Male" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div className='flex justify-end'>
                    <Button onClick={handleEditProfile} className="w-fit bg-[#0095F6] hover:bg-[#318bc7]">
                        {
                            loading ? <><Loader2 className='w-4 h-4 mr-2 animate-spin' />Please Wait</> : "Update"
                        }
                    </Button>
                </div>
            </section>
        </div>
    )
}

export default EditProfile