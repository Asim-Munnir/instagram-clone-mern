import { setMessages } from "@/redux/chatSlice"
import axios from "axios"
import { useEffect } from "react"
import { useDispatch } from "react-redux"




const useGetAllMessage = (id) => {
    const dispatch = useDispatch()

    useEffect(() => {
        const fetchAllMessage = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/message/all/${id}`, { withCredentials: true })
                if (res.data.success) {
                    dispatch(setMessages(res.data.messages))
                }
            } catch (error) {
                console.log(error)
            }
        }
        fetchAllMessage()
    }, [id])
}

export default useGetAllMessage