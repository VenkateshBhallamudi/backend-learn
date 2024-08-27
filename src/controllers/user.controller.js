import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = async (req, res) => {
    const responseFunction = (req, res) => {
        return res.status(200).json({
            message: "Venkatesh"
       })
    }

    return asyncHandler(responseFunction, req, res)
}

export { registerUser }