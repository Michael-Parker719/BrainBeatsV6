import React from 'react'
import { Bars } from "react-loader-spinner"

const Loading = () => {
    return (
        <div>
            <Bars
                height='50'
                width='100'
                color='white'
            />
        </div>
    )
} 

export default Loading;