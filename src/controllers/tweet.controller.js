import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.models.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async(req,res)=>{
    const {content} = req.body

    if(!content){
        throw new ApiError(400 , "Content is required")
    }

    const tweet = await Tweet.create({
        content,
        owner:req.user?._id
    })

    if(!tweet){
        throw new ApiError(500 , "Something went wrong while creating tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 ,tweet, "Tweet created successfully")
    )
})

const getTweetbyTweetId = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params

    if(!tweetId){
        throw new ApiError(400 , "Tweet id is required!!")
    } 

    const tweet = await Tweet.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(tweetId)
            }
        },


        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"tweetowner"
            }
        },
        {
             $unwind:"$tweetowner"
        },

        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likesontweet",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"likedBy",
                            foreignField:"_id",
                            as:"likeontweetowner"
                        }
                    },
                    {
                        $unwind: "$likeontweetowner"
                    },
                    {
                        $project:{
                            username:"$likeontweetowner.username",
                            fullname:"$likeontweetowner.fullname",
                            avatar:"$likeontweetowner.avatar"
                        }
                    }
                ]
            }
        },


        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"tweet",
                as:"commentontweet",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"commentowner"
                        }
                    },
                    {
                        $unwind:"$commentowner"
                    },
                    {
                        $lookup:{
                            from:"likes",
                            localField:"_id",
                            foreignField:"comment",
                            as:"likeoncomment",
                            pipeline:[
                                {
                                    $lookup:{
                                        from:"users",
                                        localField:"likedBy",
                                        foreignField:"_id",
                                        as:"likeoncommentowner"
                                    }
                                },
                                {
                                    $unwind:"$likeoncommentowner"
                                },
                                {
                                    $project:{
                                        username:"$likeoncommentowner.username",
                                        fullname:"$likeoncommentowner.fullname",
                                        avatar:"$likeoncommentowner.avatar"
                                    }
                                }
                            ]
                        }
                    },

                    {
                        $project:{
                            content:1,
                            createdAt:1,
                            username:"$commentowner.username",
                            fullname:"$commentowner.fullname",
                            avatar:"$commentowner.avatar",
                            likeoncomment:1,
                            likecount:{$size:"$likeoncomment"}
                        }
                    }
                ]
            }
        },

        {
            $project:{
                content:1,
                createdAt:1,
                username:"$tweetowner.username",
                fullname:"$tweetowner.fullname",
                avatar:"$tweetowner.avatar",
                commentontweet:1,
                likesontweet:1,
                likesontweetcount:{$size:"$likesontweet"},
                commentontweetcount:{$size:"$commentontweet"}
            }
        }

    ])

    if(!tweet.length){
        throw new ApiError(400 , "Tweet not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , tweet[0] , "Tweet found")
    )
})

const getTweetbyUserId = asyncHandler(async(req,res)=>{
    const {userId} = req.params

    if(!userId){
        throw new ApiError(400 , "User Id not provided")
    }
    
    const tweet = await Tweet.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likes"
            }
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"tweet",
                as:"comments"
            }
        },
        {
            $addFields:{
                likecount:{
                    $size:"$likes"
                },
                commentcount:{
                    $size:"$comments"
                }
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                likecount:1,
                commentcount:1,
                username:"$owner.username",
                fullname:"$owner.fullname",
                avatar:"$owner.avatar"
            }
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet, "Tweet fetched succefully")
    )
})

export {
    createTweet,
    getTweetbyTweetId,
    getTweetbyUserId
}