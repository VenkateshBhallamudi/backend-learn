// const asyncHandler = (requestHandler) => {
//     (req, res, next) => {
//         Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
//     }
// }



// const asyncHandler = (fn) => async (req, res) => {
//     try {
//         return await fn(req, res)
//     } catch(error) {
//         return await res.status(err.code || 500).json({
//             success:false,
//             message: err.message
//         })
//     }
// }

async function asyncHandler(fn, req, res, next) {
    try {
        return await fn(req, res, next)
    } catch(error) {
        return await res.status(error.code || 500).json({
            success:false,
            message: error.message
        })
    }
}
export {asyncHandler}