import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"

export const verifyJWT = async (req, res, next) => {

    const responseFunction = async (req, res, next) => {
        try {
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

            if(!token) {
                throw new ApiError(401, "Unauthorized request")
            }
            
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

            const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
            if(!user) {
                throw new ApiError(401, "Invalid Access Token")
            }
            
            req.user = user;
            next()
        } catch (error) {
            throw new ApiError(500, error?.message || "Something went wrong while authenticating the user")
        }
    }

    return await asyncHandler(responseFunction, req, res, next)
}