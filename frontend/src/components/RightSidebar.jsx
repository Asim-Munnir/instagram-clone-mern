import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import SuggestedUser from './SuggestedUser'

const RightSidebar = () => {
  const { user } = useSelector(store => store.auth)


  return (
    <div className='w-fit my-10 pr-32'>
      <div className='flex items-center gap-2'>
        <Link to={`/profile/${user?._id}`}>
          <Avatar>
            <AvatarImage src={user?.profilePicture} />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </Link>
        <div>

          <h1 className='font-semibold text-sm'>
            <Link to={`/profile/${user?._id}`}>
              {user?.username.charAt(0).toUpperCase() + user?.username.slice(1).toLowerCase()}
            </Link>
          </h1>

          <div className='flex gap-5'>
            <span className='text-gray-600 text-sm'>{user?.bio || "Bio here..."}</span>
            <Link className='text-sm text-blue-800'>Switch</Link>
          </div>

        </div>

      </div>

      {/* suggested user code */}
      <SuggestedUser />
    </div>
  )
}

export default RightSidebar