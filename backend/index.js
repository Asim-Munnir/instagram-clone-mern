import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import connectDB from "./utils/db.js"
import path from "path"


import userRoute from "./routes/user.route.js"
import postRoute from "./routes/post.route.js"
import messageRoute from "./routes/message.route.js"
import { app, server } from "./socket/socket.js"

dotenv.config()

const __dirname = path.resolve()
console.log(__dirname)


app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "I'm coming from backend..."
    })
})

// Default Middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true
}
app.use(cors(corsOptions))


const PORT = process.env.PORT || 3000

// apis
app.use("/api/v1/user", userRoute)
app.use("/api/v1/post", postRoute)
app.use("/api/v1/message", messageRoute)


app.use(express.static(path.join(__dirname, "frontend/dist")))

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

// Connect to DB first, then start server
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`✅ Server listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Failed to connect to DB. Server not started.");
    });

