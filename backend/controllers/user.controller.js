import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { json } from "express";

// register controller

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All Fields Are Required"
            })
        }

        const user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({
                success: false,
                message: "User Already Exist With This Email"
            })
        }

        // hash password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        await User.create({
            username,
            email,
            password: hashedPassword
        })

        return res.status(201).json({
            success: true,
            message: "Account Created Successfully"
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// login controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All Fileds Are Required"
            })
        }

        let user = await User.findOne({ email })
            .populate("followers", "username profilePicture")
            .populate("following", "username profilePicture")
            .populate("posts");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Does Not exist"
            })
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password)
        if (!isPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect Email Or Password"
            })
        }

        // generate jwt
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' })

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: user.posts
        }

        return res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000
        }).status(200).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed To login"
        })
    }
}

// logout code here

export const logout = async (req, res) => {
    try {

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed To logout"
        })
    }
}

// get profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id
        let user = await User.findById(userId).select("-password").populate({
            path: "posts",
            createdAt: -1
        }).populate({
            path: "bookmarks",
            createdAt: -1
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            user
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "server error"
        })
    }
}


// edit profile
export const editProfile = async (req, res) => {
    try {
        const userId = req.user._id
        const { bio, gender } = req.body;
        const profilePicture = req.file;

        let cloudResponse;

        const user = await User.findById(userId).select("-password")
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            })
        }

        if (profilePicture && user.profilePicture) {
            const publicId = user.profilePicture.split("/").pop().split(".")[0]; // extract public id
            await cloudinary.uploader.destroy(publicId)
        }

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture)
            cloudResponse = await cloudinary.uploader.upload(fileUri)
            user.profilePicture = cloudResponse.secure_url
        }

        if (bio) user.bio = bio;
        if (gender) user.gender = gender;

        await user.save()

        return res.status(200).json({
            success: true,
            message: "Profile updated..!",
            user
        })

    } catch (error) {
        console.error("Error in editProfile:", error);

        // Send proper response to client
        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating profile",
            error: error.message, // optional, can omit in production
        });
    }
}


// getSuggested User
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.user._id } }).select("-password")
        if (!suggestedUsers) {
            return res.status(400).json({
                message: "Currently do not have any users"
            })
        }
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.error("Error in getSuggestedUsers:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching suggested users",
            error: error.message // optional, production me sensitive info na dikhaye
        });
    }
}


// followOrUnfollow code
export const followOrUnfollow = async (req, res) => {
    try {
        const currentUserId = req.user._id // jo fllow kry ga
        const targetUserId = req.params.id; // jisko Follow karunga

        if (targetUserId === currentUserId.toString()) {
            return res.status(400).json({
                message: "You cannot follow/unfollow yourself",
                success: false
            })
        }

        const targetUser = await User.findById(targetUserId)
        const currentUser = await User.findById(currentUserId)

        if (!targetUser || !currentUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // now check follow krna ha ya unfollow

        const isFollowing = currentUser.following.includes(targetUserId)
        if (isFollowing) {
            // unfollow logic
            await Promise.all([
                User.updateOne({ _id: currentUserId }, { $pull: { following: targetUserId } }),
                User.updateOne({ _id: targetUserId }, { $pull: { followers: currentUserId } })
            ])
            return res.status(200).json({
                message: "Unfollowed Successfully",
                success: true
            })
        } else {
            // follow logic
            await Promise.all([
                User.updateOne({ _id: currentUserId }, { $push: { following: targetUserId } }),
                User.updateOne({ _id: targetUserId }, { $push: { followers: currentUserId } })
            ])
            return res.status(200).json({
                success: true,
                message: "Followed Successfully"
            })
        }

    } catch (error) {
        console.error("Error in followOrUnfollow:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while following/unfollowing the user",
            error: error.message // optional, debug ke liye
        });
    }
}