import axios from "axios";
import buildPath from "./Path";

const downloadAPI = async (
  method: any,
  path: any,
  data: any = null,
  responseType: string = ""
) => {
  const config: any = {
    method,
    url: buildPath(path),
    params: "",
    data: "",
  };

  if (responseType) {
    config.responseType = responseType;
  }
  // console.log(config);
  if (method === "get") config.params = data;
  else config.data = data;

  try {
    const res = await axios(config);
    return res;
  } catch (error) {
    console.error("Error with API request", error);
    throw error;
  }
};

export default downloadAPI;
