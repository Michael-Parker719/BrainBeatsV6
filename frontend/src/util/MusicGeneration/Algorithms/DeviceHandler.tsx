/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. Link: https://github.com/dbuezas/arduino-web-uploader */

import { upload, boards } from 'web-arduino-uploader'

document.addEventListener('button', async () => {
  const onProgress = (percentage) => {
    console.log(percentage + '%')
  }
 
  //const verify = false // optional
  //const portFilters = {} // optional, e.g. [{"usbProductId":46388,"usbVendorId":1241}]
  console.log('starting')
  //https://brainbeatz.xyz/frontend/src/util/MusicGeneration/Algorithms/FILENAME
  await upload(boards.nanoOldBootloader, 'http://your-site.com/hex-file.hex', onProgress, verify, portFilters)
  console.log('done!')
})

