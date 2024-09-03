import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { response } from "express";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = async (req, res) => {
    const responseFunction = async (req, res) => {

        //Fields extraction and basic validation logic
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


        // Avatar and CoverImage available logic
        let coverImageLocalPath, avatarLocalPath

        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
            avatarLocalPath = req.files.avatar[0].path;
        }


        // Avatar and CoverImage upload on cloudinary logic
        let avatar, coverImage
        if (avatarLocalPath) {
            avatar = await uploadOnCloudinary(avatarLocalPath)
        }

        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath)
        }


        // Database creation of object
        const user = await User.create({
            fullName,
            avatar: avatar ? avatar.url : "",
            coverImage: coverImage ? coverImage.url : "",
            email,
            password,
            username: username.toLowerCase(),
        })

        // Response send
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

    return await asyncHandler(responseFunction, req, res)
}

const loginUser = async (req, res) => {
    // Req body -> data
    // Username or email
    // Find the user
    // Password check
    // Access and refresh token
    // Send cookie

    const responseFunction = async (req, res) => {
        const { email, username, password } = req.body

        if (!password) {
            throw new ApiError(400, "Password is required")
        }

        if (!username && !email) {
            throw new ApiError(400, "Username or Email is required")
        }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (!user) {
            throw new ApiError(404, "User does not exist")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials")
        }
        console.log(`Password credentials verified for ${user.username} and ${user.email}`);

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200,
                    {
                        user: loggedInUser, accessToken, refreshToken
                    },
                    "User logged in successfully"
                )
            )
    }

    return await asyncHandler(responseFunction, req, res)
}

const logoutUser = async (req, res) => {
    const responseFunction = async (req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    // This removes the field from the document
                    refreshToken: 1
                }
            },
            {
                new: true
            })

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
            new ApiResponse(200, {}, "User logged out successfully")
        )
    }

    return await asyncHandler(responseFunction, req, res)
}

const refreshAccessToken = async (req, res) => {
    const responseFunction = async (req, res) => {
        try {
            const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

            if (!incomingRefreshToken) {
                throw new ApiError(401, "Unauthorized request")
            }

            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

            const user = await User.findById(decodedToken?._id)

            if (!user) {
                throw new ApiError(401, "Invalid Refresh token");
            }

            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or used")
            }

            const options = {
                httpOnly: true,
                secure: true
            }

            const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

            return response
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed")
                )

        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token")
        }
    }

    return await asyncHandler(responseFunction, req, res)
}

const changeCurrentPassword = async (req, res) => {
    const responseFunction = async (req, res) => {
        const { oldPassword, newPassword } = req.body

        const user = await User.findById(req.user?._id)

        if (!user) {
            throw new ApiError(401, "Sent user does not exist")
        }

        isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password")
        }

        user.password = newPassword
        await user.save({ validateBeforeSave: false })

        return res.status(200).json(
            new ApiResponse(200, {}, "Password changed successfully")
        )
    }

    return await asyncHandler(responseFunction, req, res)
}

const getCurrentUser = async (req, res) => {
    const responseFunction = async (req, res) => {
        return res
            .status(200)
            .json(200, req.user, "Current user fetched successfully")
    }

    return await asyncHandler(responseFunction, req, res)
}

const updateAccountDetails = async (req, res) => {
    const responseFunction = async (req, res) => {
        const { fullName, email } = req.body

        if (!fullName || !email) {
            throw new ApiError(400, "All fields are required")
        }

        const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email: email
                }
            },
            { new: true }
        ).select("-password")

        return res.status(200).json(
            new ApiResponse(200, user, "Account details updated successfully")
        )
    }

    return await asyncHandler(responseFunction, req, res)
}

const updateUserAvatar = async (req, res) => {
    const responseFunction = async (req, res) => {
        const avatarLocalPath = req.file?.path

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar")
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            { new: true }
        ).select("-password")

        return res.status(200).json(
            new ApiResponse(200, user, "Avatar Image Uploaded Successfully")
        )
    }

    return await asyncHandler(responseFunction, req, res)
}

const updateUserCoverImage = async (req, res) => {
    const responseFunction = async (req, res) => {
        const coverImageLocalPath = req.file?.path

        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover image file is missing")
        }

        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading on cover image")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            { new: true }
        ).select("-password")

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "Cover Image Updated Successfully")
            )
    }

    return await asyncHandler(responseFunction, req, res)
}

const getUserChannelProfile = async (req, res) => {
    const responseFunction = async (req, res) => {
        const { username } = req.params

        if (!username?.trim()) {
            throw new ApiError(400, "Username is missing")
        }

        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addField: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelIsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1,
                }
            }
        ])

    }

    return await asyncHandler(responseFunction, req, res)
}

const getWatchHistory = async (req, res) => {
    const responseFunction = async (req, res) => {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1                                            
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
        )
    }

    return await asyncHandler(responseFunction, req, res)
}

export {
    registerUser, loginUser, logoutUser,
    refreshAccessToken, changeCurrentPassword,
    getCurrentUser, updateAccountDetails, updateUserAvatar,
    updateUserCoverImage, getUserChannelProfile, getWatchHistory
}