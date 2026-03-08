import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "User not Authenticated"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            })
        }

        const user = await User.findById(decoded._id)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // if user is find now attach to request
        req.user = user
        next()

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    }
}

export default isAuthenticated