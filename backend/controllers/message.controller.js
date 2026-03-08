import { Conversation } from "../models/conversation.model.js"
import { Message } from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

// for chatting
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.user._id; // auth middleware se aa raha
        const receiverId = req.params.id
        const { textMessage } = req.body;

        if (!receiverId || !textMessage) {
            return res.status(400).json({
                success: false,
                message: "ReceiverId and message are required"
            });
        }

        // 1️⃣ Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        // 2️⃣ If not exists → create new conversation
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: []
            });
        }

        // 3️⃣ Create message
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: textMessage
        });

        if (newMessage) {
            // 4️⃣ Push message into conversation
            conversation.messages.push(newMessage._id);
        }

        await Promise.all([conversation.save(), newMessage.save()])

        // implement socket io for real time data transfer
        const receiverSocketId = getReceiverSocketId(receiverId)

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage)
        }


        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            newMessage
        });

    } catch (error) {
        console.error("Send Message Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getMessage = async (req, res) => {
    try {
        const senderId = req.user._id
        const receiverId = req.params.id

        // Find conversation
        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        }).populate("messages");

        if (!conversation) {
            return res.status(200).json({
                success: true,
                messages: []
            });
        }

        return res.status(200).json({
            success: true,
            messages: conversation.messages
        });

    } catch (error) {
        console.error("Get Messages Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}
