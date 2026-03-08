import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";


// Add New Post

export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body
        const image = req.file;
        const authorId = req.user._id

        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Image Required"
            })
        }

        // image upload
        const optimizeImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: "inside" })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        // buffer to data Uri
        const fileUri = `data:image/jpeg;base64,${optimizeImageBuffer.toString('base64')}`
        const cloudResponse = await cloudinary.uploader.upload(fileUri)

        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        })
        const user = await User.findById(authorId)
        if (user) {
            user.posts.push(post._id)
            await user.save()
        }

        await post.populate({ path: 'author', select: '-password' })

        return res.status(201).json({
            success: true,
            message: "New Post Added",
            post
        })

    } catch (error) {
        console.error("Add New Post Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating post",
            error: error.message
        });
    }
}

// get All Post
export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "author",
                select: "username profilePicture"
            })
            .populate({
                path: "likes",
                select: "username profilePicture"
            })
            .populate({
                path: "comments",
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: "author",  // Comment model ka field
                    select: "username profilePicture"
                }
            });

        return res.status(200).json({
            success: true,
            posts
        });

    } catch (error) {
        console.error("Get All Post Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch posts"
        });
    }
};


// getUserPost code
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.user._id
        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: "author",
                select: "username profilePicture"
            })
            .populate({
                path: "likes",
                select: "username profilePicture"
            })
            .populate({
                path: "comments",
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: "author",   // Comment model ka field
                    select: "username profilePicture"
                }
            });

        return res.status(200).json({
            success: true,
            posts
        })
    } catch (error) {
        console.error("Get User Posts Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch user posts"
        });
    }
}

// post like code here

export const likePost = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const postId = req.params.id;

        const post = await Post.findByIdAndUpdate(
            postId,
            { $addToSet: { likes: currentUserId } },
            { new: true }
        ).populate("author", "username profilePicture");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // implement socket io for real time notification
        const user = await User.findById(currentUserId).select('username profilePicture')
        const postOwnerId = post.author._id.toString();
        if (postOwnerId !== currentUserId) {
            // emit a notification
            const notification = {
                type: 'like',
                userId: currentUserId,
                userDetails: user,
                postId: postId,
                message: 'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId)
            io.to(postOwnerSocketId).emit('notification', notification)
        }

        return res.status(200).json({
            success: true,
            message: "Post liked",
            post
        });

    } catch (error) {
        console.error("Like Post Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to like post"
        });
    }
};

// dislike post code here

export const dislikePost = async (req, res) => {
    try {
        const currentUserId = req.user._id; // Logged in user
        const postId = req.params.id;

        // Remove userId from likes array
        const post = await Post.findByIdAndUpdate(
            postId,
            { $pull: { likes: currentUserId } }, // Pull removes if exists
            { new: true }
        ).populate("author", "username profilePicture");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // implement socket io for real time notification
        const user = await User.findById(currentUserId).select('username profilePicture')
        const postOwnerId = post.author._id.toString();
        if (postOwnerId !== currentUserId) {
            // emit a notification
            const notification = {
                type: 'dislike',
                userId: currentUserId,
                userDetails: user,
                postId: postId,
                message: 'Your post was dislike'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId)
            io.to(postOwnerSocketId).emit('notification', notification)

        }


        return res.status(200).json({
            success: true,
            message: "Post disliked",
            post
        });

    } catch (error) {
        console.error("Dislike Post Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to dislike post"
        });
    }
}

// comment add code here

export const addComment = async (req, res) => {
    try {
        const commentedUserId = req.user._id; // logged in user
        const postId = req.params.id;

        const { text } = req.body;

        // validation
        if (!text || text.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Comment text is required",
            });
        }

        // check post
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // create comment
        const comment = await Comment.create({
            text,
            author: commentedUserId,
            post: postId,
        });

        // push comment to post
        post.comments.push(comment._id);
        await post.save();

        // populate author
        await comment.populate({
            path: "author",
            select: "username profilePicture",
        });

        return res.status(201).json({
            success: true,
            message: "Comment added successfully",
            comment,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error while adding comment",
        });
    }
}

// Get Comment Post
export const getCommentOfPost = async (req, res) => {
    try {
        const postId = req.params.id
        const comments = await Comment.find({ post: postId }).populate('author', 'username profilePicture')

        if (comments.length === 0) {
            return res.status(404).json({
                message: "No comments found for this post",
                success: false
            })
        }

        return res.status(200).json({
            success: true,
            comments
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching comments",
        });
    }
}

// delete post code
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id
        const authorId = req.user._id

        const post = await Post.findById(postId)

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            })
        }

        // check if the logged-in user is the owner of the post
        if (post.author.toString() !== authorId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized User!",
            });
        }

        await Post.findByIdAndDelete(postId)

        // remove postId from user's posts array
        await User.findByIdAndUpdate(
            authorId,
            { $pull: { posts: postId } },
            { new: true }
        );

        // delete assosiated comments
        await Comment.deleteMany({ post: postId })

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// bookmark post code
export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        const user = await User.findById(authorId);

        const isBookmarked = user.bookmarks.some(
            (id) => id.toString() === postId
        );

        // 🔴 Remove bookmark
        if (isBookmarked) {
            await User.findByIdAndUpdate(
                authorId,
                { $pull: { bookmarks: postId } }
            );

            return res.status(200).json({
                success: true,
                type: "unsaved",
                message: "Post removed from bookmarks",
            });
        }

        // 🟢 Add bookmark
        await User.findByIdAndUpdate(
            authorId,
            { $addToSet: { bookmarks: postId } }
        );

        return res.status(200).json({
            success: true,
            type: "saved",
            message: "Post bookmarked successfully",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
