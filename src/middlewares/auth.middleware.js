import {User} from "../models/user.models.js"
import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const verifyJWT = asyncHandler(async(req,_,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

        if(!token){
            throw new ApiError(400 , "Unauthorised request")
        }

        const decodedInfo = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedInfo?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(400 , "Invalid Access")
        }
        req.user=user
        next()
    } catch (error) {
        throw new ApiError(400,error?.message , "Invalid access token")
    }
}) 

export {verifyJWT}