import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs"



const uploadOnCloudinary = async (localFilePath) => {
    // Configuration
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!localFilePath) return null

    // Upload an image
    const uploadResult = await cloudinary.uploader
    .upload(
        localFilePath, {
            resource_type: "auto",     
        }
    )
    .catch((error) => {
        console.log(error);
        fs.unlinkSync(localFilePath)
        return null
    });

    // file has been uploaded successfully
    console.log("File has been uploaded on cloudinary successfully ", uploadResult.url)
    console.log(uploadResult)
    fs.unlinkSync(localFilePath)
    return uploadResult
}

export { uploadOnCloudinary }