import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import sendAPI from "../../../SendAPI";
import { userJWT, userModeState } from "../../../JWT";
import { useRecoilState, useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";
import buildPath from "../../../util/ImagePath";
import RecordCards from "../../ScriptContainer/Scripts/Cards/RecordCards";
import CardCarousel from "../../CardCarousel/CardCarousel";
import { resizeMe } from "../../../util/ImageHelperFunctions";
import React from "react";
import { useDispatch } from "react-redux";
import isDev from "../../../util/isDev";
import * as Tone from "tone";

import Playback from "../../Playback/Playback";

import { Track, Like, Script } from "../../../util/Interfaces";

// Import CSS
import "./ScriptModal.css";
import "../../ScriptCard/ScriptCard.css";
import TrackCard from "../../TrackCard/TrackCard";
import { time } from "console";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import * as Interfaces from "../../../util/Interfaces";
import {
  setScriptIDGlobal,
  unsetScriptIDGlobal,
} from "../../../Redux/slices/scriptIDSlice";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";

type Props = {
  script: Interfaces.Script;
  closeModal: React.Dispatch<React.SetStateAction<boolean>>;
};

const emptyLikeArr: Interfaces.Like[] = [];

const ScriptModal: React.FC<Props> = ({ script, closeModal }) => {
  const navigate = useNavigate();
  const jwt: any = useRecoilValue(userJWT);
  const [user, setUser] = useRecoilState(userModeState);

  const [editing, setEditing] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [scriptName, setScriptName] = useState(script.title);
  const [visibility, setVisibility] = useState(script.public);
  const [editVisibility, setEditVisibility] = useState(false);
  const [buttonText, setButtonText] = useState(
    visibility ? "Make Private" : "Make Public"
  );
  const [thumbnail, setThumbnail] = useState(script.thumbnail);

  const [likeCount, setLikeCount] = useState(script.likeCount);

  const [handleDelete, setHandleDelete] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string>(
    "Are you sure you want to delete this Script?"
  );

  // The ternary just sets the like array to the user like array if it exists, else the empty
  const [userLikeArr, setUserLikeArr] = useState(
    user ? (user.likes ? user.likes : emptyLikeArr) : emptyLikeArr
  );

  const [favorited, setFavorited] = useState(false); // change this later

  const dispatch = useDispatch();

  // Initializes favorited variable
  useEffect(() => {
    checkScriptOwner();
    checkLike();
  }, [isModalOpen]);

  // ============================= Functions for User Track =============================
  function checkScriptOwner() {
    if (user != null) {
      if (user?.id === script.userID) {
        setEditVisibility(true);
      }

      // if(user.likes !== undefined){
      //   setUserLikeArr(user.likes);
      // }
    }
  }

  // ============================= Functions for Track Updating System =============================

  function verifyDeleteRecording() {
    let erase = window.confirm(
      "Want to delete track '" +
        script.title +
        "'? \nPress ok to delete this track."
    );

    // if(erase) {
    //   closeModal(false);
    // }
    // window.alert("Once you close this track, the track will be deleted.");

    return erase;
  }

  function doDelete() {
    let data = { scriptID: script.id, token: jwt };

    console.log("Attemting to delete...");
    console.log(data);
    // setIsModalOpen(true);
    // let deleteConfirmed = false;
    let deleteConfirmed = verifyDeleteRecording();

    if (deleteConfirmed) {
        sendAPI("delete", "/scripts/deleteScript", data).then((res) => {
          if (res.status !== 200) {
            setErrMsg("Failed To Delete");
            setSuccessMsg("");
          } else {
            // Close the modal, refresh the posts showed on current page
            console.log("Sucessfully deleted Script");
            console.log("Data: " + data);
            setErrMsg("");
            setSuccessMsg("");
            closeModal(false);
            window.location.reload();
          }
        });
      }
    // if (deleteConfirmed) {
    //   sendAPI("delete", "/tracks/deleteTrack", data).then((res) => {
    //     if (res.status !== 200) {
    //       setErrMsg("Failed To Delete");
    //       setSuccessMsg("");
    //     } else {
    //       // Close the modal, refresh the posts showed on current page
    //       setErrMsg("");
    //       setSuccessMsg("");
    //       closeModal(false);
    //       window.location.reload();
    //     }
    //   });
    // }
  }

  // Function to open the modal with a specific message
  const openModal = (message: string) => {
    setMessage(message); // Set the message for confirmation
    setIsModalOpen(true); // Show the modal
  };

  // Function to handle the confirmation (e.g., delete action)
  const handleConfirmDeletion = () => {
    console.log("Item deleted!");
    // Close the modal after confirming
    setIsModalOpen(false);
  };

  // Function to handle cancel action
  const handleCancel = () => {
    setIsModalOpen(false); // Close the modal without doing anything
  };

  function setVisibilityButton() {
    setVisibility(!visibility);
    setButtonText(visibility ? "Make Private" : "Make Public");
  }

  // Updates a track
  function updateScript(
    newVisibility = visibility,
    newScriptName = scriptName,
    thumbnailPic = displayThumbnail,
    likes = likeCount
  ) {
    if (jwt == null || user == null) navigate("/login");

    // check if picture is of valid size before moving on
    // i.e.: <= 2mb

    let updatedScript = {
      id: script.id,
      title: newScriptName,
      thumbnail: thumbnailPic,
      likeCount: likes,
      public: newVisibility,
      token: jwt,
    };

    sendAPI("put", "/scripts/updateScript", updatedScript).then((res) => {
      if (res.status === 200) {
        setErrMsg(scriptName);
      } else if (res.status === 413) {
        setErrMsg("Image must be < 3mb");
      } else {
        setErrMsg("Could not save post.");
        setSuccessMsg("");
      }
    });

    setEditing(false);
    script.title = newScriptName;
    script.public = newVisibility;
    script.likeCount = likes;

    // console.log("updating track");
  }

  // ============================= Functions for Track Cover System =============================

  // For displaying track thumbnail picture
  const [displayThumbnail, setDisplayThumbnail] = useState(
    script !== null ? script.thumbnail : undefined
  );

  if (displayThumbnail !== undefined && displayThumbnail !== null) {
    if ((displayThumbnail as string).split("/")[0] === "data:text") {
      var encodedThumbnailPic = (displayThumbnail as string).split(",")[1];
      var decodedThumbnailPic = Buffer.from(
        encodedThumbnailPic,
        "base64"
      ).toString("ascii");
      setDisplayThumbnail(buildPath(decodedThumbnailPic));
    }
  }

  // Returns the compressed Base64 image
  // Borrowed from: https://github.com/josefrichter/resize/blob/master/public/preprocess.js
  // function compressImage(file:File) {
  //   const fr = new FileReader();

  //   fr.readAsArrayBuffer(file);
  //   fr.onload = function (ev: ProgressEvent<FileReader>) {

  //     var res = ev.target?.result
  //     if (!res) {
  //       console.error("Error resizing image");
  //       return;
  //     }

  //     // blob stuff
  //     var blob = new Blob([res]); // create blob...
  //     window.URL = window.URL || window.webkitURL;
  //     var blobURL:string = window.URL.createObjectURL(blob); // and get it's URL

  //     // helper Image object
  //     var image:HTMLImageElement = new Image();
  //     image.src = blobURL;

  //     image.onload = function() {

  //       // have to wait till it's loaded
  //       var resized = resizeMe(image); // send it to canvas

  //       if (!resized) {
  //         console.error("Error resizing image");
  //       }
  //       else {
  //         // console.log("resized image", resized);
  //         return resized;
  //       }
  //     }
  //   };
  // }

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
      };
    });
  }

  // Function updating thumbnail picture
  async function updateThumbnail(script: Interfaces.Script) {
    if (displayThumbnail != null) {
      script.thumbnail = displayThumbnail;
    }
  }

  //Function updating display thumbail picture in modal
  async function updateDisplayThumbnail(file: File) {
    var base64result: any;

    /* This is returning a compressed base 64 image of <= 1024 x 1024
     * However it will not correctly display when I attempt to attach it to the model
     *
     * var compressedBase64:any = compressImage(file);
     */

    await convertToBase64(file).then((res) => {
      base64result = res;
      // console.log("base64", base64result);
    });

    var updatedPost = {
      id: script.id,
      token: jwt,
      thumbnail: base64result,
    };
    setDisplayThumbnail(updatedPost.thumbnail);
  }

  // ============================= Functions for Like System =============================
  // Checks for user like
  async function checkLike() {
    let favorited: boolean = false;

    // If no user or no user likes, they havent liked this.
    if (!user || !userLikeArr) {
      return false;
    }

    var currentUser = { userID: user.id };

    await sendAPI("get", "/likes/getAllUserLikes", currentUser)
      .then(async (res) => {
        for (var i = 0; i < res.data.length; i++) {
          var trackID: string = res.data[i].trackID;
          if (script.id == trackID) {
            favorited = true;
            break;
          }
        }
      })
      .catch((e) => {
        console.error("Failed to pull liked tracks: ", e);
      });

    setFavorited(favorited);
  }

  function incrementLike() {
    return new Promise((resolve, reject) => {
      var didSucceed = true;

      var newLikes: number = likeCount + 1;
      setLikeCount(newLikes);

      didSucceed ? resolve(newLikes) : reject("Error");
    });
  }

  // Creates a new like
  function addLike() {
    if (!user) {
      navigate("/login");
      return;
    }

    // Create the new like
    let newUserLike: Like = {
      objectID: script.id,
      userID: user.id,
    };

    // add it to the end of the current like array, and set the state
    let newLikeArr: Array<Interfaces.Like> = [...userLikeArr, newUserLike]; // <------
    setUserLikeArr(newLikeArr);

    // add jwt to newUserLike for the payload
    newUserLike = Object.assign({ token: jwt }, newUserLike); // <------

    console.log("USER LIKE");
    console.log(newUserLike);
    sendAPI("post", "/likes/createUserLike", newUserLike)
      .then((res) => {
        console.log("USER LIKE");
        console.log(newUserLike);
        // console.log("res: ", res.data);

        // If success
        if (res.status === 201) {
          setErrMsg(script.title);
          setSuccessMsg(JSON.stringify(res.data));
          setFavorited(true);

          incrementLike()
            .then((newlikes) => incrementLike())
            .then((newLikes) => {
              updateLikes(newLikes);
              return true;
            })
            .catch((err) =>
              console.error("There was an error liking this post. ", err)
            );
          // updateUserLikesArray();

          var newUser: Interfaces.User = {
            // unchanged
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            bio: user.bio,
            profilePicture: user.profilePicture,
            username: user.username,
            token: jwt,
            // likes: [...user.likes, res.data]
          };

          setUser(newUser);
          // setUserLikeArr(newUser.likes);
        } else {
          setErrMsg("Could not like post.");
          setSuccessMsg("");
          setFavorited(false);
        }
      })
      .catch((e) => {
        console.error("Could not like post:", e);
        setFavorited(false);
      });
  }

  function decrementLike() {
    return new Promise((resolve, reject) => {
      if (likeCount > 0) {
        var didSucceed = likeCount > 0;

        var newLikes: number = likeCount - 1;
        setLikeCount(newLikes);

        didSucceed ? resolve(newLikes) : reject("Error");
      }
    });
  }

  // Removes a new like
  function removeLike() {
    if (user != null) {
      let removedLike: Like = {
        userID: user.id,
        objectID: script.id,
        token: jwt,
      };

      setFavorited(false);

      sendAPI("delete", "/likes/removeUserLike", removedLike).then((res) => {
        if (res.status === 200) {
          setErrMsg(script.title);
          setSuccessMsg(JSON.stringify(res.data));

          // Decrements local likeCount
          decrementLike()
            .then((newLikes) => decrementLike())
            .then((newLikes) => {
              updateLikes(newLikes);
              return true;
            })
            .catch((err) =>
              console.error("There was an error unliking this post.", err)
            );

          // Searching for unfavorited track to update user LikeArray
          let newLikeArr: Array<Interfaces.Like> = [...userLikeArr];
          // console.log("removeLike() userLikeArr: ", userLikeArr);

          if (user?.likes != null) {
            for (var i = 0; i < user.likes.length; i++) {
              if (user.likes[i].trackID === removedLike.objectID)
                newLikeArr.splice(i, 1);
            }

            // Set user like array to be array with removed like
            // console.log("removeLike() newLikeArr: ", newLikeArr);

            var newUser: Interfaces.User = {
              // unchanged
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bio: user.bio,
              profilePicture: user.profilePicture,
              username: user.username,
              token: jwt,
              // likes: newLikeArr
            };

            setUser(newUser);
            // setUserLikeArr(newUser.likes);
          }
        } else {
          setErrMsg("Could not like post.");
          setSuccessMsg("");
        }
      });
    } else {
      navigate("/login");
    }
  }

  function goToRecord() {
    navigate("/record");
  }
  function goToEdit() {
    navigate("/script-settings");
    dispatch(setScriptIDGlobal(script.id));
  }

  // Function updating track likes
  function updateLikes(likes: any) {
    if (jwt == null || user == null) navigate("/login");

    let updatedTrack = {
      id: script.id,
      title: script.title,
      thumbnail: script.thumbnail,
      likeCount: likes,
      public: script.public,
      token: jwt,
    };

    sendAPI("put", "/scripts/updateScript", updatedTrack).then((res) => {
      if (res.status === 200) {
        setErrMsg(scriptName);
      } else {
        setErrMsg("Could not save post.");
        setSuccessMsg("");
      }
    });

    script.likeCount = likes;
  }

  return (
    <>
      <div>
        <div className="modal-background">
          <Modal.Header
            className="modal-container-header"
            closeButton
          ></Modal.Header>
          <Modal.Body className="modal-container-body">
            <div id="modal-track-cover-div">
              {editing && (
                <div id="edit-track-cover-div">
                  <label id="track-cover-upload-label" htmlFor="trackInputTag">
                    Select Track Image:
                  </label>
                  <input
                    id="track-cover-upload"
                    onChange={(event) => {
                      if (!event.target.files) {
                        return;
                      } else {
                        updateDisplayThumbnail(event.target.files[0]);
                      }
                    }}
                    name="image"
                    type="file"
                    accept=".jpeg, .png, .jpg"
                  />
                </div>
              )}
              {/*<img src={displayThumbnail} className="card-img-top modal-track-cover" id="card-img-ID" alt="track image" onClick={() => { }} />*/}
              <CardCarousel></CardCarousel>
            </div>
            <div id="modal-track-text-div">
              {!visibility && (
                <h6 id="hidden-track-text">
                  <FontAwesomeIcon
                    className="modal-track-icons"
                    icon={["fas", "eye-slash"]}
                  />
                  hidden script
                </h6>
              )}
              {visibility && (
                <h6 id="hidden-track-text">
                  <FontAwesomeIcon
                    className="modal-track-icons"
                    icon={["fas", "eye"]}
                  />
                  Public script
                </h6>
              )}
              {!editing && <h1 id="track-title-text">{scriptName}</h1>}
              {editing && (
                <input
                  type="text"
                  id="track-title-text"
                  defaultValue={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                ></input>
              )}

              <h6 id="track-author-text">By {script.fullname} </h6>

              <div className="mt-3">
                <h6 id="track-author-text">Script:</h6>
              </div>

              <h5>{errMsg}</h5>

              <h5 id="favorites-text">
                <FontAwesomeIcon className="modal-track-icons" icon={faHeart} />
                {likeCount} Favorites
              </h5>
            </div>
          </Modal.Body>
          <Modal.Footer className="modal-container-footer">
            <div id="modal-container-footer-1">
              {editing && (
                <button
                  className="btn btn-secondary modal-btn-public"
                  onClick={() => setVisibilityButton()}
                >
                  {visibility && (
                    <FontAwesomeIcon
                      className="modal-track-icons"
                      icon={["fas", "eye"]}
                      id="visibilityButton"
                    />
                  )}
                  {!visibility && (
                    <FontAwesomeIcon
                      className="modal-track-icons"
                      icon={["fas", "eye-slash"]}
                      id="visibilityButton"
                    />
                  )}
                  {visibility ? "Make Private" : "Make Public"}
                </button>
              )}
              {editing && (
                <button
                  className="btn btn-secondary modal-btn-public"
                  id="delete-track-btn"
                  onClick={() => doDelete()}
                >
                  <FontAwesomeIcon
                    className="modal-track-icons"
                    icon={["fas", "trash"]}
                  />
                  Delete Script
                </button>
              )}
            </div>
            <div id="modal-container-footer-2">
              {!favorited && (
                <button
                  className="btn btn-secondary modal-btn"
                  id="like-track-btn"
                  onClick={() => {
                    addLike();
                  }}
                >
                  <FontAwesomeIcon
                    className="modal-track-icons"
                    icon={["far", "heart"]}
                  />
                  Favorite
                </button>
              )}
              {favorited && (
                <button
                  className="btn btn-secondary modal-btn"
                  id="dislike-track-btn"
                  onClick={() => {
                    removeLike();
                  }}
                >
                  <FontAwesomeIcon
                    className="modal-track-icons"
                    id="favorited-heart"
                    icon={faHeart}
                  />
                  Favorited
                </button>
              )}

              {/* Possibly add playlists feature in the future */}
              {/* <button className='btn btn-secondary modal-btn'>
                <FontAwesomeIcon className='modal-track-icons' icon={["fas", "plus"]} />
                Add to Playlist
              </button> */}
              {/*editing && <button className='btn btn-secondary modal-btn' onClick={() => { updateScript(); updateThumbnail(script) }}>
                                <FontAwesomeIcon className='modal-track-icons' icon={["fas", "edit"]} />
                                Save
                            </button>*/}
              <button
                className="btn btn-secondary modal-btn"
                onClick={() => goToEdit()}
              >
                <FontAwesomeIcon
                  className="modal-track-icons"
                  icon={["fas", "edit"]}
                />
                Edit
              </button>
              <button
                className="btn btn-secondary modal-btn"
                onClick={() => goToRecord()}
              >
                <FontAwesomeIcon
                  className="modal-track-icons"
                  icon={["fas", "music"]}
                />
                Record
              </button>
              <button
                className="btn btn-secondary modal-btn-public"
                id="delete-track-btn"
                onClick={() => doDelete()}
              >
                <FontAwesomeIcon
                  className="modal-track-icons"
                  icon={["fas", "trash"]}
                />
                Delete Script
              </button>

              {/* <ConfirmationModal
        isOpen={isModalOpen}
        message={message}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancel}
      /> */}
            </div>
          </Modal.Footer>
        </div>
      </div>
    </>
  );
};

export default ScriptModal;
