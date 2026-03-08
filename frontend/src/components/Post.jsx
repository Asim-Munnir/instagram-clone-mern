import React, { useEffect, useState } from 'react'
import { Avatar, AvatarImage } from './ui/avatar'
import { AvatarFallback } from '@radix-ui/react-avatar'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { Bookmark, MessageCircle, MoreHorizontal, Send } from 'lucide-react'
import { Button } from './ui/button'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import CommentDialog from './CommentDialog'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import axios from 'axios'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { Badge } from './ui/badge'


const Post = ({ post }) => {
    const [text, setText] = useState("")
    const [open, setOpen] = useState(false)
    const { user } = useSelector(store => store.auth)
    const { posts } = useSelector(store => store.post)
    const [liked, setLiked] = useState(false)
    const [postLike, setPostLike] = useState(0)
    const [comment, setComment] = useState([])
    const dispatch = useDispatch()
    const isOwnPost = user?._id === post?.author?._id;
    const isFollowing = user?.following?.includes(post?.author?._id);

    useEffect(() => {
        const isLiked = post.likes.some(like => {
            if (typeof like === "string") {
                return like === user?._id;
            }

            if (like?._id) {
                return like._id.toString() === user?._id;
            }

            return false;
        });

        setLiked(isLiked);
        setPostLike(post.likes.length);
    }, [post.likes, user?._id]);

    // Comments useEffect
    useEffect(() => {
        if (post?.comments) {
            setComment(post.comments);
        }
    }, [post.comments]);


    const changeEventHandler = (e) => {
        const inputText = e.target.value
        if (inputText.trim()) {
            setText(inputText)
        } else {
            setText("")
        }
    }

    // likeOrDislike post code here
    const likeOrDislikePostHandler = async () => {
        try {
            const action = liked ? "dislike" : "like";

            const res = await axios.get(
                `http://localhost:8000/api/v1/post/${post._id}/${action}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                // 1️⃣ Redux update (server is source of truth)
                const updatedPosts = posts.map(p =>
                    p._id === post._id ? res.data.post : p
                );

                dispatch(setPosts(updatedPosts));

                // 2️⃣ Local UI sync (safe)
                setLiked(res.data.post.likes.includes(user?._id));
                setPostLike(res.data.post.likes.length);

                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || error.message);
        }
    };


    // Post comment code here
    const commentHandler = async () => {
        const commentText = text.trim()

        if (!commentText) {
            return toast.error("Comment required")
        }

        try {
            const res = await axios.post(`http://localhost:8000/api/v1/post/${post?._id}/comment`, { text: commentText }, {
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
                    p._id === post?._id
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


    // delete post code here
    const deletePostHandler = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this post?");
        if (!confirmDelete) return;

        try {
            const res = await axios.delete(`http://localhost:8000/api/v1/post/delete/${post?._id}`, { withCredentials: true })
            if (res.data.success) {
                const updatedPostData = posts.filter((postItme) => postItme?._id !== post?._id)
                dispatch(setPosts(updatedPostData))
                toast.success(res.data.message || "Post Deleted Successfully")
                setOpen(false)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.response.data.message)
        }
    }

    const bookmarkHandler = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/post/${post?._id}/bookmark`, { withCredentials: true})
            if (res.data.success) {
                toast.success(res.data.message)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const DEFAULT_AVATAR =
        "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360";

    return (
        <div className='my-8 w-full max-w-sm mx-auto'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <Avatar>
                        <AvatarImage src={post.author.profilePicture?.trim() ? post.author.profilePicture : DEFAULT_AVATAR} />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className='flex gap-3'>
                        <h1>{post.author.username}</h1>
                        {
                            user?._id === post.author?._id && <Badge variant="secondary">Author</Badge>
                        }
                    </div>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <MoreHorizontal className='cursor-pointer' />
                    </DialogTrigger>
                    <DialogContent className="flex flex-col items-center text-center">
                        {user && !isOwnPost && (
                            <>
                                {isFollowing ? (
                                    <Button variant="ghost" className="text-red-500 font-bold">
                                        Unfollow
                                    </Button>
                                ) : (
                                    <Button variant="ghost" className="font-bold">
                                        Follow
                                    </Button>
                                )}

                                <Button variant="ghost">
                                    Add to favorites
                                </Button>
                            </>
                        )
                        }

                        {
                            user && user?._id === post?.author?._id && (
                                <Button onClick={deletePostHandler} variant='ghost' className="cursor-pointer w-fit">Delete</Button>
                            )
                        }

                    </DialogContent>
                </Dialog>
            </div>
            <img className='rounded-sm my-2 w-full aspect-square object-cover' src={post?.image?.trim() ? post.image : "https://placehold.co/600x600?text=No+Image"} alt="" />


            <div className='flex items-center justify-between my-2'>
                <div className='flex items-center gap-3'>
                    {
                        liked ? <FaHeart onClick={likeOrDislikePostHandler} size={'22px'} className='cursor-pointer text-red-600' /> : <FaRegHeart onClick={likeOrDislikePostHandler} size={'22px'} className='cursor-pointer' />
                    }

                    <MessageCircle onClick={() => {
                        dispatch(setSelectedPost(post))
                        setOpen(true)
                    }} className='cursor-pointer hover:text-gray-600' />
                    <Send className='cursor-pointer hover:text-gray-600' />
                </div>
                <Bookmark onClick={bookmarkHandler} className='cursor-pointer hover:text-gray-600' />
            </div>
            <span className='font-medium block mb-2'>{postLike} likes</span>
            <p>
                <span className='font-medium mr-2'>{post?.author?.username}</span>
                {post.caption}
            </p>
            <span onClick={() => {
                dispatch(setSelectedPost(post))
                setOpen(true)
            }} className='cursor-pointer text-sm text-gray-400'>View all {comment.length} comments</span>

            <CommentDialog open={open} setOpen={setOpen} />

            <div className='flex items-center justify-between'>
                <input
                    type="text"
                    value={text}
                    onChange={changeEventHandler}
                    placeholder='Add a comment...'
                    className='outline-none text-sm w-full'
                />
                {
                    text && <span className='text-[#3BADF8] cursor-pointer' onClick={commentHandler}>Post</span>
                }
            </div>
        </div>
    )
}

export default Post