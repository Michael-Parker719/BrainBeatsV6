import React, { useState, useEffect, useCallback } from 'react';
// import {userJWT, userModeState} from '../context/GlobalState'
import './Community.css';
import TrackCard from '../TrackCard/TrackCard';
import Carousel from '../Carousel/Carousel';
import sendAPI from '../../SendAPI';
import { Navigate } from 'react-router-dom';
import { userJWT } from '../../JWT';
import CommunityImage from '../../images/CommunityImage.jpeg';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";


// To check user state
// import { userJWT, userModeState } from "../../JWT"; 

const Community = () => {

    const userId = "";
    // Api call for featured tracks

    console.log("Solid Icons:", Object.keys(fas));
    console.log("Regular Icons:", Object.keys(far));
    console.log("Brand Icons:", Object.keys(fab));

    return (
        <div className='container' id='community-container'>
            <img id='community-image' src={CommunityImage} alt='Community' />
            <div id='community-text'>Welcome to the Community</div>
            <h2 className="text-decoration-underline" id="community-tracks-heading">Community Tracks</h2>
            <div className='container' id='track-card-container'>
                <TrackCard cardType={'Popular'} input={userId}/>
            </div>
        </div>);
}

export default Community;