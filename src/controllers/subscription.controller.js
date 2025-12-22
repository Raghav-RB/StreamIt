import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { Types } from "mongoose";
import {Subscription} from "../models/subscription.models.js"
import { User } from "../models/user.models.js";

const toggleSubscription = asyncHandler(async(req,res)=>{

    const {channelId} = req.params

    if(!channelId || !mongoose.Types.ObjectId.isValid(channelId)){
        throw new ApiError(400 ,"Invalid channel id")
    }

    if(req.user._id.toString()===channelId){
        throw new ApiError(400 , "Self subscription is not allowed")
    }

    let subscribed

    const existingUser = await Subscription.findOne({
        subscriber:req.user._id,
        channel:channelId
   } )

   if(existingUser){
    await Subscription.findByIdAndDelete(existingUser._id)
    subscribed=false
   }else{
    await Subscription.create({
        subscriber:req.user._id,
        channel:channelId
    })
    subscribed=true
   }

   const subscriberCount = await Subscription.countDocuments({channel:channelId})

   return res
   .status(200)
   .json(
    new ApiResponse(200 , {subscribed,subscriberCount},"Subscription toggeled successfully")
   )
})

const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const {channelId} = req.params

    if(!channelId || !mongoose.Types.ObjectId.isValid(channelId)){
        throw new ApiError(400 , "Invalid channel id")
    }

    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError(404,"Channel not found")
    }

    const subscribers = await Subscription.find({channel:channelId})
    .populate("subscriber","username fullname avatar")
    .select("subscriber")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , {subscribers,totalSubscribers:subscribers.length},"Subscribers fetched successfully")
    )
})

const getSubscribedChannels = asyncHandler(async(req,res)=>{
    const subscriberId = req.user._id

    if(!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)){
        throw new ApiError(400 , "Invalid subcriber id")
    }

    const channelSubscribed = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribed",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            fullname:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {$unwind:"$subscribed"},
        {
            $replaceRoot:{
                newRoot:"$subscribed"
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200 , {
               channel: channelSubscribed,
                totalSubscribedChannels:channelSubscribed.length
        },
        "Subscribed channels fetched successfully"
        )
    )

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}