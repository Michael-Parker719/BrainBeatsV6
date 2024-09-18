import { CompactPicker } from 'react-color';
import { useState, useEffect } from 'react';
import './Cards.css';
import { Modal } from 'react-bootstrap';
import ImageModal from '../../../Modals/ImageModal/ImageModal';
import { useAppSelector } from '../../../../Redux/hooks';
import { Card, Script } from '../../../../util/Interfaces'
import { useDispatch } from 'react-redux';
import { set, unset } from '../../../../Redux/slices/cardArraySlice'
import { setScriptIDGlobal, unsetScriptIDGlobal } from '../../../../Redux/slices/scriptIDSlice'
import { useNavigate } from 'react-router-dom';
import videojs from 'video.js';
import VideoJS from '../../../Video/Video';
import Player from "video.js/dist/types/player";
import React from 'react';
import 'video.js/dist/video-js.css';
import { useRecoilState, useRecoilValue } from 'recoil';
import { userModeState, userJWT } from '../../../../JWT';
import sendAPI from '../../../../SendAPI';
import { emptyScript } from '../../../../util/Constants';
// import "https://cdn..net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css";


function Cards() {
    // console.log("bruh")

    const initialBackground = {
        displayColorPicker: false,
        color: {
            r: 14,
            g: 14,
            b: 14,
            a: 14,
        },
    }
    const initialTextColor = {
        displayColorPicker: false,
        color: {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        },
    }


    // For displaying Modal
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);

    const [selectedView, setSelectedView] = useState("color");

    // For collecting image from Redux
    const image = useAppSelector(state => state.imageSlice)
    const dispatch = useDispatch();

    // For holding card information
    const globalCard = useAppSelector(state => state.cardArraySlice)
    const [cards, setCards] = useState<Card[]>([...globalCard])
    const [cardText, setCardTextState] = useState('');
    const [cardDisplayed, setCardDisplayed] = useState(0);
    const [speed, setSpeed] = useState(1000)
    const [backgroundColor, setBackgroundColor] = useState(initialBackground);
    const [textColor, setTextColor] = useState(initialTextColor);
    const [imageURL, setImageURL] = useState('');
    const [videoURL, setVideoURL] = useState('');
    const [audioURL, setAudioURL] = useState('');
    const [usingVideoAudio, setUsingVideoAudio] = useState(false);

    const [scriptTitle, setScriptTitle] = useState('');

    const [scriptID, setScriptID] = useState(useAppSelector(state => state.scriptIDSlice));

    const [started, setStarted] = useState(false);

    // useEffect(() => {
    //     if (scriptID != '') {
    //         setCards(useAppSelector(state => state.cardArraySlice))
    //         
    //     }
    // }, [])




    const playerRef = React.useRef<Player>();
    const videoJsOptions = {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: false,
        height: "500px",
        width: "auto",
        loop: true,
        sources: [{
            src: videoURL,
            type: 'video/mp4'
        }]
    };

    // Navigating
    const navigate = useNavigate();
    const doNavigate = (route: string) => {
        navigate(route);
    }

    const handlePlayerReady = (player: Player) => {
        playerRef.current = player;

        // You can handle player events here, for example:
        player.on('waiting', () => {
            videojs.log('player is waiting');
        });

        player.on('dispose', () => {
            videojs.log('player will dispose');
        });
    };

    const resetVideo = () => {
        console.log("reset!");
        if (playerRef.current) {
            playerRef.current.currentTime(0);

        }
    }

    const handleVideoAudio = () => {
        setUsingVideoAudio(!usingVideoAudio);
        console.log(usingVideoAudio);
    }

    function convertToBase64(file: File) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            /* This block of code converts the file's old name into one that includes the user's ID for storing */
            // var fileName:string = file.name;
            // var extensionArray:string[] = fileName.split('.');
            // var fileExtension:string = extensionArray[extensionArray.length - 1]; // in the case that there may be any extra '.' for some reason
            // var renameStr:string = user.userId + '.' + fileExtension
            // var renamedFile:File = new File([file], renameStr)
            fileReader.readAsDataURL(file);

            fileReader.onload = () => {
                resolve(fileReader.result);
            };
            fileReader.onerror = (error) => {
                reject(error);
            }
        })
    }

    const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // setImageURL(event.target.name); 
        if (!event.target.files) {
            console.log("it's null")
            return
        }
        if (event.target.files[0].size > 64000) {
            console.error("File too big! Must be 64KB or less");
            return;
        }

        let file64: any
        await convertToBase64(event.target.files[0]).then(res => {
            file64 = res
        })
        setImageURL(file64)
        // setImageURL(URL.createObjectURL(event.target.files[0]));


    }

    const uploadVideo = (event: React.ChangeEvent<HTMLInputElement>) => {
        // setImageURL(event.target.name); 
        if (!event.target.files) {
            console.log("it's null")
            return
        }

        console.log("setting video!", event.target.files[0]);

        setVideoURL(URL.createObjectURL(event.target.files[0]));
        // videoJsOptions.sources =
        //     [{
        //         src: URL.createObjectURL(event.target.files[0]),
        //         type: 'video/mp4'
        //     }]

    }

    const uploadAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            console.log("it's null")
            return
        }
        if (event.target.files[0].size > 16777215) {
            console.error("File too big! Must be 16MB or less");
            return;
        }

        let file64: any
        await convertToBase64(event.target.files[0]).then(res => {
            file64 = res
        })
        setAudioURL(file64);
    }
    const disableAudio = () => {
        return selectedView === "video" && usingVideoAudio;
    }

    const handlePageClick = (event: any) => {
        // const newOffset = (event.selected * itemsPerPage) % items.length;
        setCardDisplayed(event.selected - 1);
        console.log(
            `User requested page number ${event.selected}`
        );
        // setItemOffset(newOffset);
    };

    const setColorBackground = (color: { rgb: any; }) => {
        setBackgroundColor({ displayColorPicker: backgroundColor.displayColorPicker, color: color.rgb });
        setImageURL('');
    };
    const setColorText = (color: { rgb: any; }) => {
        setTextColor({ displayColorPicker: textColor.displayColorPicker, color: color.rgb });
        console.log("new text color", textColor)
    };

    const changeCard = (cardInd: number) => {

        let newCard: Card = {
            textColor: textColor.color,
            backgroundColor: backgroundColor.color,
            speed: speed,
            text: cardText,
            imageURL: imageURL,
            audioURL: audioURL,
        }
        cards[cardDisplayed] = newCard;

        setCardDisplayed(cardInd);
    }

    const addCard = () => {
        // if (cardText === '' && imageURL === '') {
        //     alert("Invalid Card format: Must include either an image or text")
        //     return
        // }
        let newCard: Card = {
            textColor: initialTextColor.color,
            backgroundColor: initialBackground.color,
            speed: 1000,
            text: '',
            imageURL: '',
            audioURL: '',
        }
        cards.push(newCard);

        changeCard(cards.length - 1);


        // dispatch(set(cards));
    }
    if (cards.length === 0)
        addCard()

    const sendCards = () => {
        changeCard(cardDisplayed);
        dispatch(set(cards));
    }

    const [user, setUser] = useRecoilState(userModeState);
    const jwt = useRecoilValue(userJWT);



    const saveScript = () => {
        console.log("saving script!", cards);
        changeCard(cardDisplayed);

        if (!user) {
            console.error("You must be logged in to create a post");
            navigate('/login');
            return;
        }


        const info: Script = {
            id: scriptID,
            userID: user.id,
            title: scriptTitle,
            token: jwt,
            public: true,
            cards: cards,
            likeCount: 0,
        }
        if (scriptID.length === 0) {
            sendAPI('post', '/scripts/createScript', info)
                .then(res => {
                    console.log("Save Script!", res);
                    // setScriptID(res.data.id);
                    navigate('/profile')
                }).catch(err => {
                    console.error("error!", err);
                })
        }
        else {
            sendAPI('post', '/scripts/updateScript', info)
                .then(res => {
                    console.log("Save Script!", res);
                    // setScriptID(res.data.id);
                }).catch(err => {
                    console.error("error!", err);
                })
        }

    }

    const cardSelect = (count: number) => {
        const options = []
        for (let i = 1; i <= count; i++) {
            let option = <option key={i} value={i}>{i}</option>
            options.push(option)

        }
        return (
            <select value={cardDisplayed + 1} onChange={(e) => changeCard(+e.target.value - 1)}>
                {options}
            </select>
        )
    }

    const deleteSlide = () => {
        if (cards.length === 1) {
            console.log("Cannot remove only slide!")
            return
        }
        if (cards.length === cardDisplayed + 1) {
            changeCard(cardDisplayed - 1)
            cards.pop()
        }
        else if (cardDisplayed === 0) {
            cards.shift()
            changeCard(cardDisplayed)
        }
        else {
            cards.splice(cardDisplayed, 1)
            changeCard(cardDisplayed)
        }
        console.log(cardDisplayed)
        console.log(cards)





    }


    useEffect(() => {
        setImageURL(image.urls.regular)
        setShow(false);
    }, [image]);

    useEffect(() => {
        let i = cardDisplayed;
        setBackgroundColor({ displayColorPicker: false, color: cards[i].backgroundColor });
        setTextColor({ displayColorPicker: false, color: cards[i].textColor });
        setCardTextState(cards[i].text);
        setSpeed(cards[i].speed);
        setImageURL(cards[i].imageURL);
        setAudioURL(cards[i].audioURL);


    }, [cardDisplayed, cards]);

    return (
        <div id='record-card-info-div'>
            <Modal id='pop-up' show={show} onHide={handleClose}>
                <ImageModal /*setImageURL={setImageURL}*/ />
            </Modal>
            <div className='cards-body-div'>
                <div id='card-settings-div'>
                    <label className='record-heading'>Title:</label>
                    <div className='record-upload1'>
                        <input
                            className="input-card-text"
                            placeholder="My Script"
                            onChange={(e) => setScriptTitle(e.target.value)}
                            value={scriptTitle}
                        />
                    </div>
                    <h6 className='record-heading'>Card Settings</h6>
                    <div id='record-uploads-div'>
                        <div>
                            <input type="radio" id="color-select" name="card-type" value="color"
                                checked={selectedView === "color"}
                                onChange={() => setSelectedView("color")} />
                            <label className='check-box' htmlFor="color">Color</label>
                        </div>

                        <div>
                            <input type="radio" id="image-select" name="card-type" value="image"
                                checked={selectedView === "image"}
                                onChange={() => setSelectedView("image")} />
                            <label className='check-box' htmlFor="image">Image</label>
                        </div>

                        {/*<div>
                            <input type="radio" id="video-select" name="card-type" value="video"
                                checked={selectedView === "video"}
                                onChange={() => setSelectedView("video")} />
                            <label className='check-box' htmlFor="video">Video</label>
                        </div>*/}

                        <div id='color-settings' className='area-settings' hidden={selectedView !== "color"}>
                            <label className='record-heading2' htmlFor="file-upload">Select Background Color</label>
                            <div className='record-upload1'>
                                <CompactPicker
                                    onChange={setColorBackground}
                                />
                            </div>
                        </div>

                        <div className='area-settings' hidden={selectedView !== "image"}>
                            <button type="button" className="btn btn-secondary" id='image-card-btn' onClick={() => setShow(true)}>Stock Image</button>
                            <h6 className='OR-subtitle'>OR</h6>
                            <label className='record-heading2' htmlFor="file-upload">Select Image File:</label>
                            <input type="file" className="btn btn-secondary" onChange={uploadImage} />
                        </div>

                        {/*<div className='area-settings' hidden={selectedView !== "video"}>
                            <label className='record-heading2' htmlFor="file-upload">Select Video File:</label>
                            <input type="file" className="btn btn-secondary" onChange={uploadVideo} />


                            <label className='record-heading' htmlFor="file-upload">Video Start Time:</label>
                            <div className='record-upload1'>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Seconds"
                                    className="timeInput"
                                    onChange={(e) => setSpeed(e.target.valueAsNumber)}
                                    value={speed}
                                />
                            </div>

                            <input type="checkbox" id="video-check" checked={usingVideoAudio} onChange={handleVideoAudio}></input>
                            <label className='check-box' htmlFor="video-check">Use video audio</label>

                        </div>*/}

                        <label className='record-heading2' htmlFor="file-upload">Upload Audio File:</label>
                        <input type="file" className="btn btn-secondary" disabled={disableAudio()} onChange={uploadAudio} />

                        {/*<label className='record-heading' htmlFor="file-upload">Audio Start Time:</label>
                        <div className='record-upload1'>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Seconds"
                                className="timeInput"
                                onChange={(e) => setSpeed(e.target.valueAsNumber)}
                                value={speed}
                                disabled={disableAudio()}
                            />
                        </div>*/}


                        <label className='record-heading' htmlFor="file-upload">Text Color:</label>
                        <div className='record-upload1'>
                            <CompactPicker
                                onChange={setColorText}
                            />
                        </div>
                        <label className='record-heading' htmlFor="file-upload">Enter Text:</label>
                        <div className='record-upload1'>
                            <input
                                className="input-card-text"
                                placeholder="Your text here"
                                onChange={(e) => setCardTextState(e.target.value)}
                                value={cardText}
                            />
                        </div>
                        <label className='record-heading' htmlFor="file-upload">Card Duration (milliseconds):</label>
                        <div className='record-upload1'>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Seconds"
                                className="timeInput"
                                onChange={(e) => setSpeed(e.target.valueAsNumber)}
                                value={speed}
                            />
                        </div>
                        <button type="button" className="btn btn-secondary" id='add-card-btn' onClick={addCard}>Add Card</button>
                    </div>

                </div>
                <div id='display-card-div'>
                    Card Display:
                    <div id='card-display'
                        style={{
                            color: `rgba(${textColor.color.r}, ${textColor.color.g}, ${textColor.color.b}, ${textColor.color.a})`,
                            background: `rgba(${backgroundColor.color.r}, ${backgroundColor.color.g}, ${backgroundColor.color.b}, ${backgroundColor.color.a})`,
                            backgroundImage: `url(${imageURL})`,
                        }}
                    >
                        <div id='card-text'>
                            <h1>{cardText}</h1>
                        </div>
                    </div>
                    {/*<VideoJS className="video" options={videoJsOptions} onReady={handlePlayerReady} />*/}
                    {/*<div>
                        <video id="example_video_1" className="video-js vjs-default-skin" controls preload="auto" width="auto" height="500px" data-setup='{}'>
                            <source src={videoURL} type="video/mp4" data-quality="hd" data-res="HD" data-default="true"></source>
                            <p className="vjs-no-js">To view this video please enable JavaScript, and consider upgrading to a web browser that <a href="http://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>.</p>
                        </video>
                    </div>*/}
                </div>
            </div>
            <div>
                {cardSelect(cards.length)}
                {/*<button type="button" className="btn btn-secondary" onClick={deleteSlide}>Delete</button>*/}
            </div>

            <div className='cards-footer-div'>
                <div id='record-buttons-div'>
                    {/*<button type="button" className="btn btn-secondary" id='skip-step-btn' onClick={() => doNavigate("/record")}>Skip This Step</button>*/}
                    <button type="button" className="btn btn-secondary" id='go-record-btn' onClick={() => { saveScript() }}>Save Script</button>
                </div>
            </div>
        </div>);
}

export default Cards; 
