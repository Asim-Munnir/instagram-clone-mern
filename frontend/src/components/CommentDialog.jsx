import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './ui/button'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts } from '@/redux/postSlice'

const CommentDialog = ({ open, setOpen }) => {
    const [text, setText] = useState("")
    const { selectedPost, posts } = useSelector(store => store.post)
    const [comment, setComment] = useState([])
    const dispatch = useDispatch()


    const changeEventhandler = (e) => {
        const inputText = e.target.value
        if (inputText.trim()) {
            setText(inputText)
        } else {
            setText("")
        }
    }

    // Comments useEffect
        useEffect(() => {
            if (selectedPost?.comments) {
                setComment(selectedPost.comments);
            }
        }, [selectedPost?.comments]);


    // Post comment code here
    const setMessageHandler = async () => {
        const commentText = text.trim()

        if (!commentText) {
            return toast.error("Comment required")
        }

        try {
            const res = await axios.post(`http://localhost:8000/api/v1/post/${selectedPost?._id}/comment`, { text: commentText }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            })

            if (res.data.success) {
                const newComment = res.data.comment

                // ✅ 1. Local comments state update
                setComment(prev => [...prev, newComment])

                // now again updated post
                const updatedPosts = posts?.map(p =>
                    p._id === selectedPost?._id
                        ? { ...p, comments: [...(p.comments || []), newComment] }
                        : p
                )
                dispatch(setPosts(updatedPosts))

                setText("")
                toast.success(res.data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.message || error.message)
        }
    }

    return (
        <Dialog open={open}>
            <DialogContent onInteractOutside={() => setOpen(false)} className="max-w-5xl p-0 flex flex-col">

                <div className='flex flex-1'>

                    <div className='w-1/2'>
                        <img className='w-full h-[480px] object-cover rounded-l-lg' src={selectedPost?.image} alt="post_img" />
                    </div>

                    <div className='w-1/2 flex flex-col justify-between'>
                        <div className='flex items-center justify-between p-4'>
                            <div className='flex gap-3 items-center'>
                                <Link>
                                    <Avatar>
                                        <AvatarImage src={selectedPost?.author?.profilePicture} />
                                        <AvatarFallback>CN</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div>
                                    <Link className='font-semibold text-xs'>{selectedPost?.author?.username}</Link>
                                    {/* <span className='text-gray-600 text-sm'>Bio here...</span> */}
                                </div>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <MoreHorizontal className='cursor-pointer' />
                                </DialogTrigger>

                                <DialogContent className="flex flex-col items-center text-sm text-center">
                                    <div className='cursor-pointer w-full text-[#ED4956] font-bold border-b-2'>
                                        Unfollow
                                    </div>
                                    <div className='cursor-pointer w-full text-[#ED4956] font-bold border-b-2'>
                                        Add to favourite
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <hr />
                        <div className='flex-1 overflow-y-auto max-h-96 p-4'>
                            {
                                comment.map((comment) => <Comment key={comment._id} comment={comment} />)
                            }
                        </div>

                        <div className='p-4'>

                            <div className='flex gap-2'>
                                <input
                                    type="text"
                                    value={text}
                                    onChange={changeEventhandler}
                                    placeholder='Add a comment...'
                                    className='w-full outline-none border text-sm p-2 rounded border-gray-300'
                                />
                                <Button disabled={!text.trim()} onClick={setMessageHandler} variant='outline'>Send</Button>
                            </div>
                        </div>

                        <div>

                        </div>
                    </div>

                </div>

            </DialogContent>
        </Dialog>
    )
}

export default CommentDialog