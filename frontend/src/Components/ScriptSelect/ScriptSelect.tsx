import { useRecoilValue, useRecoilState } from 'recoil';
import { userJWT, userModeState } from "../../JWT";
import sendAPI from '../../SendAPI';
import react, { useEffect, useState } from 'react';
import TrackCard from '../TrackCard/TrackCard';
import ScriptCard from '../ScriptCard/ScriptCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Buffer } from 'buffer';
import buildPath from '../../util/ImagePath';
import { encode, resize } from '../../util/ImageHelperFunctions';
import { useNavigate } from 'react-router-dom';

import { Track, User } from '../../util/Interfaces';


const ScriptSelect = () => {

    const [user, setUser] = useRecoilState(userModeState);
    const jwt = useRecoilValue(userJWT);
    <div id='profile-bottom-container'>
        <h1>My Scripts</h1>
        <hr></hr>
        {user && <ScriptCard cardType={'Profile'} input={user.id} />}
    </div>
    const navigate = useNavigate();

    function kickNonUser() {
        // console.log(user);
        if (!user) {
            navigate('/login');
            return;
        }
    }

    useEffect(() => {
        kickNonUser();
        if (user != null) {
            // getProfileTracks();
            // getUserLikes();
            // getUpdatedUser();
        }
    }, [])


    return (
        <div id='profile-bottom-container'>
            <h1>My Scripts</h1>
            <hr></hr>
            {user && <ScriptCard cardType={'Profile'} input={user.id} />}
        </div>

    )
}

export default ScriptSelect;
