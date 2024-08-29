import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = async (req, res) => {
    const responseFunction = async (req, res) => {
        const { fullName, email, username, password } = req.body

        if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
            throw new ApiError(400, "All fields are required")
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists")
        }
        let coverImageLocalPath, avatarLocalPath
        console.log(req.files)

        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
            avatarLocalPath = req.files.avatar[0].path;
        }

        console.log(`Avatar local path ${avatarLocalPath}`);
        console.log(`Cover Image local path ${coverImageLocalPath}`);
        
        // if (!avatarLocalPath) {
        //     throw new ApiError(400, "Avatar file is required local path")
        // }

        let avatar, coverImage
        if(avatarLocalPath) {
             avatar = await uploadOnCloudinary(avatarLocalPath)
        }

        if(coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath)
        }

        //  if(!avatar) {
        //      throw new ApiError(400, "Avatar file is required cloudinary")
        //  }

        const user = await User.create({
            fullName,
            avatar: avatar ? avatar.url : "",
            coverImage: coverImage ? coverImage.url : "",
            email,
            password,
            username: username.toLowerCase(),
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered successfully")
        )
    }

    return asyncHandler(responseFunction, req, res)
}

export { registerUser }