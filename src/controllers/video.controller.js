import mongoose from "mongoose";
import {uploadfileonCloudinary} from "../utils/cloudinary.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.models.js"
import {Video} from "../models/video.models.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {v2 as cloudinary} from 'cloudinary'

const getAllVideos = asyncHandler(async(req,res)=>{
    const {
        page=1,
        limit=10,
        query,
        sortBy="createdAt",
        sortType="desc",
        userId
    } = req.query

    const matchBox = {}
    matchBox.isPublished=true

    if(query){
        matchBox.$or=[
            {
                title:{
                    $regex:query,
                    $options:"i"
                }
            },
            {
                description:{
                    $regex:query,
                    $options:"i"
                }
            }
        ]
    }

    if(userId){
        if(mongoose.Types.ObjectId.isValid(userId)){
            matchBox.owner = new mongoose.Types.ObjectId(userId)
        }
        else{
            throw new ApiError(404 , "Invalid user")
        }
    }

    const allowed = ["createdAt" , "views" , "duration" , "title"]
    if(!allowed.includes(sortBy)){
        throw new ApiError(400 , "Invalid sort")
    }

    const sortTypeAllowed = ["desc","asc"]
    if(!sortTypeAllowed.includes(sortType)){
        throw new ApiError(400 , "Bad sorting")
    }

    const sorting={}
    sorting[sortBy]=sortType==="asc"?1:-1
    
    const pageValue = parseInt(page,10) || 1
    const limitValue = parseInt(limit,10) ||10

    const video = await Video.aggregate([
        {
            $match:matchBox
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            fullname:1,
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $sort:sorting
        },
        {
            $skip:(pageValue-1)*limitValue
        },
        {
            $limit:limitValue
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200 , video , "Video found")
    )
})

const publishAVideo = asyncHandler(async(req,res)=>{
    const {title , description} = req.body

    if(!title || !description){
        throw new ApiError(400 , "All fields are required")
    }

    if(title.length<5 || title.length>100){
        throw new ApiError(400 , "Title length should be between 5 to 100")
    }

    if(description.length>5000){
        throw new ApiError(400 , "Description length should be less then 5000")
    }
    
    const videoLocalPath = req.files?.videoFile[0].path
    // console.log(req.files?.videoFile[0]);
    if(!videoLocalPath){
        throw new ApiError(400 , "Video file is required")
    }

    const thumbnailLocalPath = req.files?.thumbnail[0].path
    if(!thumbnailLocalPath){
        throw new ApiError(400 , "Thumbnail is required")
    }

    const videoFile = await uploadfileonCloudinary(videoLocalPath)
    const thumbnail = await uploadfileonCloudinary(thumbnailLocalPath)

    const video = await Video.create({
        title,
        description,
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        duration:videoFile.duration,
        owner:req.user._id,
        isPublished:true
    })

    if(!video){
        throw new ApiError(400 , "Something went wrong while creating a video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , video , "Video Published Successfully")
    )
})

const getvideoById = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError(400 , "No video Id is given")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400 , "No such video exist")
    }   

    return res
    .status(200)
    .json(
        new ApiResponse(200 , video , "Video found")
    )
})

const updateVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError(400 , "No video Id is given")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400 , "No such video exist")
    }

    if (!req.user || !req.user._id) {
        throw new ApiError(401, "Authentication required");
  }

    if(video.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403 , "You cannot update this video")
    }

    const {title,description} = req.body
    const thumbnailLocalPath = req.file?.path

    if(!title && !description && !thumbnailLocalPath){
        throw new ApiError(400 , "Provide at least one field")
    }

    if(title){
        if(title.length>5 && title.length<100){
         video.title=title
        }else{
            throw new ApiError(400 , "Title length should be between 5 to 100")
        }
    }
    if(description){
        if(description.length<5000){
         video.description=description
        }else{
            throw new ApiError(400 , "Description length should be less then 5000")
        }
    }

    if(thumbnailLocalPath){
        const thumbnail = await uploadfileonCloudinary(thumbnailLocalPath)
        video.thumbnail=thumbnail.url
    }

    await video.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(200 , video , "Video updated")
    )
})

const deleteVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError(400 , "No video Id available")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404 , "No such video exists")
    }

    if(!req.user || !req.user._id){
        throw new ApiError(400 , "Authorization Error")
    }

    if(video.owner.toString()!=req.user._id.toString()){
        throw new ApiError(403 , "You cannot delete this video")
    }

    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(
        new ApiResponse(200 , "Video deleted successfully")
    )
})

const publishToggle = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError(400 , "No video id obtained")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404 , "No such video found")
    }

    if(!req.user || !req.user._id){
        throw new ApiError(400 , "Authorization error")
    }

    if(video.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403 , "You are not authorized to take this action")
    }

    video.isPublished=!video.isPublished
    const update = await video.save()

    if(!update){
        throw new ApiError(500 , "Something went wrong")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 ,{PublishStatus:update.isPublished} , "Action taken succefully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getvideoById,
    updateVideo,
    deleteVideo,
    publishToggle
}