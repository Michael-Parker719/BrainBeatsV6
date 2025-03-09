import axios from 'axios'
import buildPath from './Path'

const sendAPI = async (method:any, path:any, data:any = null) => {    
    const config = {
        method,
        url: buildPath(path),
        params: '',
        data: ''
    }
    // console.log(config);
    if(method === 'get') config.params =  data;
    else config.data = data;

    // console.log("+++++++++++++++++++++");
    // console.log("CONFIG");
    // console.log(config);
    // console.log("+++++++++++++++++++++");
    const res = await axios(config);
    // console.log('Response:', res);
    return res;
}


export default sendAPI;