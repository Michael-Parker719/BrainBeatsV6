import { useEffect, useState } from 'react';
import './ScriptCard.css';
import { Modal } from 'react-bootstrap';
import TrackModal from '../Modals/TrackModal/TrackModal';
import ScriptModal from '../Modals/ScriptModal/ScriptModal';
import sendAPI from '../../SendAPI';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { Track, Script, Card } from '../../util/Interfaces';
import { useDispatch } from 'react-redux';
import { set, unset } from '../../Redux/slices/cardArraySlice'
import { emptyTrack, emptyScript } from '../../util/Constants';
import { useRecoilState } from 'recoil';
import { userJWT, userModeState } from '../../JWT';
// import { Script } from 'vm';
import DEFAULT_IMAGE from '../../images/script_default.png'
import { current } from '@reduxjs/toolkit';

type Props = {
    cardType: string;
    input: string; // was :any
    submitted: boolean;
    isSearched: boolean;
}

const ScriptCard: React.FC<Props> = ({ cardType, input, submitted, isSearched }) => {

    // For displaying Modal
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const [currentScript, setCurrentScript] = useState<Script>(emptyScript);
    const [scriptList, setScriptList] = useState<Script[]>([]);
    const [newScriptList, setNewScriptList] = useState<any[]>([]);
    const [scriptsPulled, setScriptsPulled] = useState(false);
    const [currentSearch, setCurrentSearch] = useState('');

    const dispatch = useDispatch();

    // For refresing script list component on page
    const [seed, setSeed] = useState(1);

    const resetScriptComponent = () => {
        // console.log("resetTrackComponent()");
        setSeed(Math.random());
        setNewScriptList(PopulateScriptCards()); // need to debug. not calling checklike when opening/editing unliked track.
        // console.log("resetting seed");
    }

    useEffect(() => {
        PopulateScriptCards()
    }, [submitted]);
    // Initializes newTrackList
    // useEffect(() => {
    //     setNewTrackList(PopulateTrackCards()); // need to debug. not calling checklike when opening/editing unliked track.
    //     // console.log("use effect: " + newTrackList);
    // }, []);


    // ! Possibly not needed
    // We do this a lot, so this returns an objArray containing our tracks
    // from the api call
    // function populateObjectArrayFromTracks(data:Array<Track>, numTracks:number = data.length) {
    //     var objArray:Track[] = [];

    //     for(var i = 0; i < data.length; i++) {
    //         if(i > numTracks) break;

    //     }
    //     return 
    // }

    async function getPopularScripts(numScripts: number) {

        // hit api for 'numTracks' tracks
        var objArray: Script[] = [];

        await sendAPI('get', '/scripts/getPublicPopularScripts')
            .then((res) => {
                for (let i = 0; i < res.data.length; i++) {
                    if (i > numScripts) break;

                    // Here the track is unchanged so just push it
                    // No need to do for each entry
                    let currentScript: Script = res.data[i];
                    currentScript.fullname = res.data[i].user.firstName + ' ' + res.data[i].user.lastName;
                    objArray.push(currentScript);

                }
                setScriptList(objArray);
                setScriptsPulled(true)
            })
            .catch(err => {
                console.error(err);
            });
        return;
    }

    async function getSearchScripts(title: string) {
        var objArray: Script[] = [];
        setCurrentSearch(title);
        // console.log(title)
        let query = { title: title };
        
        await sendAPI('get', '/scripts/getScriptsByTitle', query)
            .then((res) => {
                for (var i = 0; i < res.data.length; i++) {

                    var currentScript: Script = res.data[i];

                    var fullname: string = res.data[i].firstName + ' ' + res.data[i].lastName;

                    // Copy over the script from res, "append" the fullname key-value to it
                    currentScript = Object.assign({ fullname: fullname }, currentScript);

                    // var currentScript:Track = {
                    //     createdAt: res.data[i].createdAt,
                    //     id: res.data[i].id,
                    //     likeCount: res.data[i].likeCount,
                    //     midi: res.data[i].midi,
                    //     public: res.data[i].public,
                    //     thumbnail: res.data[i].thumbnail,
                    //     title: res.data[i].title,
                    //     userID: res.data[i].userID,
                    //     fullname: res.data[i].user.firstName + ' ' + res.data[i].user.lastName
                    // }
                    objArray.push(currentScript);
                }
                setScriptList(objArray);
                setScriptsPulled(true)
            })
            .catch(err => {
                console.error(err);
            });
        return;
    }

    async function getProfileScripts() {
        var objArray: Script[] = [];

        var currentUser = { userID: input };

        await sendAPI('get', '/scripts/getUserScriptsByID', currentUser)
            .then(res => {
                // console.log(res)
                for (var i = 0; i < res.data.length; i++) {
                    // console.log("+++++++++++++++++++++++++");
                    // console.log(res.data[i]);
                    // console.log("+++++++++++++++++++++++++");
                    var currentScript: Script = res.data[i];
                    var fullname: string = res.data[i].firstName + ' ' + res.data[i].lastName;
                    currentScript = Object.assign({ fullname: fullname }, currentScript);

                    objArray.push(currentScript);
                }

                setScriptList(objArray);
                setScriptsPulled(true)
                // console.log("Script List:", scriptList)

            }).catch(e => {
                console.error("Failed to pull profile scripts: ", e);
            })
    }

    async function getLikedScripts() {
        var objArray: Script[] = [];

        var currentUser = { userID: input };

        await sendAPI('get', '/likes/getAllUserLikes', currentUser)
            .then(async (res) => {
                for (var i = 0; i < res.data.length; i++) {

                    var scriptID: string = res.data[i].scriptID;
                    var currentScript: Script = await getLikedScriptByID(scriptID);

                    var fullname: string = currentScript?.user?.firstName + ' ' + currentScript?.user?.lastName;
                    // console.log(currentScript.user);
                    currentScript = Object.assign({ fullname: fullname }, currentScript);

                    objArray.push(currentScript);
                }
                setScriptList(objArray);
                setScriptsPulled(true)

            }).catch(e => {
                console.error("Failed to pull liked scripts: ", e);
            })
    }

    async function getLikedScriptByID(scriptID: string) {

        let scriptObj = { id: scriptID };

        let likedScript: Script = emptyScript;

        await sendAPI('get', '/scripts/getScriptByID', scriptObj)
            .then(res => {

                if (res.status === 200) {
                    likedScript = {
                        "id": res.data.id,
                        "title": res.data.title,
                        "userID": res.data.userID,
                        "public": res.data.public,
                        "user": res.data.user,
                        "cards": res.data.cards,
                        "likeCount": 0,
                    }
                }
                // console.log(likedScript);

            }).catch(e => {
                console.error("Failed to pull liked scripts: ", e);
            })
        return likedScript;
    }

    function PopulateScriptCards() {
        const MAX_COLS: number = 4;
        const MAX_ROWS: number = 4;
        var gridArray: any[] = [];
        var currentScriptCounter: number = 0;

        //cardType Search goes outside of the conditional because there is the case where searching has already happened
        if (cardType === 'Search' && currentSearch !== input)
            getSearchScripts(input);
        if (!scriptsPulled) {
            if (cardType === 'Profile') getProfileScripts();
            else if (cardType === 'Popular') getPopularScripts(MAX_COLS * MAX_ROWS);
            else if (cardType === 'Likes') getLikedScripts();
        }

        for (let i = 0; i < MAX_ROWS; i++) {
            for (let j = 0; j < MAX_COLS; j++) {
                let currentScript = scriptList[currentScriptCounter++];

                if (currentScript == null) break;
                if (!currentScript.public && cardType !== 'Profile') continue;
                // if (currentScript.thumbnail === "") {
                //     if (currentScript.cards[0].imageURL !== "") {
                //         currentScript.thumbnail = currentScript.cards[0].imageURL;
                //     }
                //     else {
                //         currentScript.thumbnail = DEFAULT_IMAGE
                //     }
                // }
                currentScript.thumbnail = DEFAULT_IMAGE

                //let trackLink = JSON.stringify(currentScript.trackLink);
                let title = currentScript.title;
                let user = currentScript.fullname;

                gridArray.push(currentScript);
            }
        }

        // console.log("PopulateScriptCards()");
        return gridArray;
    }

    function hexToColor(hex: string) {
        let red = Number("0x" + hex.substring(0, 2));
        let green = Number("0x" + hex.substring(2, 4));
        let blue = Number("0x" + hex.substring(4, 6));

        return {
            r: red,
            g: green,
            b: blue,
            a: 255,
        }

    }

    async function setScript(currentScript: Script) {
        var objArray: Card[] = [];
        // must set cards here!
        console.log("Current ID == " + currentScript.id);
        console.log(currentScript);
        let scriptParams = {id: currentScript.id};
        await sendAPI('get', '/scripts/getCardsByScriptID', scriptParams)
            .then(res => {
                console.log('Response Data:', res);
                function compareCards(card1: any, card2: any) {
                    return card1.order - card2.order
                }
                res.data.sort(compareCards)
                for (var i = 0; i < res.data.length; i++) {
                    let currentCard: Card = res.data[i];
                    currentCard.textColor = hexToColor(res.data[i].textColor);
                    currentCard.backgroundColor = hexToColor(res.data[i].backgroundColor);

                    // var fullname: string = res.data[i].user.firstName + ' ' + res.data[i].user.lastName;
                    // currentCard = Object.assign({ fullname: fullname }, currentScript);

                    objArray.push(currentCard);
                }

                // setCardList(objArray);
                // setScriptsPulled(true)
                console.log("Card List:", objArray)

            }).catch(e => {
                console.error("Failed to pull script cards: ", e);
            })

        dispatch(set(objArray))

        setCurrentScript(currentScript);
        setShow(true);
    }

    let scriptCards = PopulateScriptCards();

    return (
        <div className='container text-center'>
            <div className='row script-row'>
                {scriptCards.map((scriptCard, index) => (
                    <div className="col script-col" key={index}>
                        <button className=" btn btn-primary card" onClick={() => setScript(scriptCard)}>
                            <img src={scriptCard.thumbnail} className="card-img-top" id="card-img-ID" alt="..." />
                            <div className="card-body">
                                <h5 className="card-title">{scriptCard.title}</h5>
                                <div className="card-text">
                                    <p id='card-author'>{scriptCard.fullname}</p>
                                    <div id='card-likes'>
                                        <FontAwesomeIcon className='modal-script-icons' icon={faHeart} />
                                        {scriptCard.likeCount}
                                    </div>
                                </div>

                            </div>
                        </button>
                    </div>
                ))}
            </div>
            <Modal id='pop-up' show={show} onHide={handleClose} onExit={resetScriptComponent}>
                <ScriptModal key={seed} script={currentScript} closeModal={setShow} isSearched={isSearched} />
            </Modal>
        </div>
    )
};

export default ScriptCard;
