import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadfileonCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import jwt  from "jsonwebtoken";
import mongoose from "mongoose";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Could not generate Tokens");
  }
};

const option = {
  httpOnly: true,
  secure: true,
};

const registerUser = asyncHandler(async function (req, res) {
  const { username, fullname, email, password } = req.body;

  if (
    [username, fullname, email, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(400, "Username or email already registered");
  }

  let avatarLocalPath
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadfileonCloudinary(avatarLocalPath);
  const coverImage = await uploadfileonCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image is not uplouded");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!userCreated) {
    throw new ApiError(500, "Could not create the user");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, userCreated , "Successfull registeration")
    )
});

const LoginUser = asyncHandler(async function (req, res) {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "username or email atleast one is required!!");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect Passwaord");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(new ApiResponse(200, { loggedInUser }, "LoginIn successful"));
});

const LogoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
      new:true
    }
  )

  return res
  .status(200)
  .clearCookie("accessToken",option)
  .clearCookie("refreshToken",option)
  .json(
    new ApiResponse(200,"User Logged out")
  )
})

const RefreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(400 , "Unauthorised request")
  }
try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if(!user){
      throw new ApiError(400 , "Invalid user")
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(400, "Refresh token mismatch");
    }


    const {accessToken,refreshToken} = await generateTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(
      new ApiResponse(200 ,{accessToken,refreshToken} , "Token refreshed")
    )
  
}catch (error) {
  throw new ApiError(401, error.message);
 }})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

  const {oldPassword,newPassword,confPassword} = req.body

  if(!oldPassword || !newPassword || !confPassword){
    throw new ApiError(400 , "All fields are required")
  }

  if(newPassword!==confPassword){
    throw new ApiError(400 , "new Password and Confirm Password needs to be same")
  }

  const user = await User.findById(req.user._id)
  const passwordValidation = await user.isPasswordCorrect(oldPassword)

  if(!passwordValidation){
    throw new ApiError(400 , "Incorrect Password")
  }

  user.password=newPassword
  await user.save({validateBeforeSave:false})

  return res
  .status(200)
  .json(
   new ApiResponse (200,{},"Password Updated")
  )
})

const currentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(
    new ApiResponse(200 , req.user , "Current user fetched")
  )
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {username,fullname,email} = req.body

  if(!username && !fullname && !email){
    throw new ApiError(400 , "Atleast one field is required")
  }

  let existingByusername=false
  let existingByemail=false

  if(username && username.trim()!==""){
     existingByusername = await User.findOne(
      {
        username,
        _id:{$ne:req.user?._id}
      }
    )
  }
  if(existingByusername){
    throw new ApiError(400 , "Username is already taken")
  }

  if(email && email.trim()!==""){
     existingByemail = await User.findOne(
      {
        email,
        _id:{$ne:req.user?._id}
      }
    )
  }
  if(existingByemail){
    throw new ApiError(400 , "Email is already in use")
  }

  const update={}
 if (username && username.trim() !== "") {
    update.username = username.toLowerCase();
  }

  if (email && email.trim() !== "") {
    update.email = email;
  }

  if (fullname && fullname.trim() !== "") {
    update.fullname = fullname;
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set:update},
    {new:true }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200 , {user} , "Details updated")
  )
})

const updateAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(200 , "Avatar file is not recieved")
  }

  const avatar = await uploadfileonCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(500 , "Could not uploud avatar")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        avatar:avatar.url
    }
  },{
    new:true
  }
  )

  return res
  .status(200)
  .json(
    new ApiResponse(200 , user , "Avatar Updated")
  )
})

const updatecoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(200 , "Cover Image file is not recieved")
  }

  const coverImage = await uploadfileonCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(500 , "Could not uploud Cover cImage")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
    }
  },{
    new:true
  }
  )

  return res
  .status(200)
  .json(
    new ApiResponse(200 , user , "Cover Image Updated")
  )
})

const UserProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400 , "Username does not exist")
  }

  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size:"$subscribers"
        },
        subscribedToCount:{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{if:{$in:[
             req.user?._id ? new mongoose.Types.ObjectId(req.user?._id):null,
             "$subscribers.subscriber"
          ]},
          then:true,
          else:false
          }
        }
      }
    },
    {
      $project:{
        fullname:1,
        username:1,
        coverImage:1,
        avatar:1,
        subscribersCount:1,
        subscribedToCount:1,
        isSubscribed:1
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(400 , "no such channel exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200 , channel , "Channel found")
  )
})

const getwatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
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
          {
            $addFields:{
              owner:{
                $first:"$owner"
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
    new ApiResponse(200 , user[0].watchHistory , "Watch History fetched")
  )
})

export {registerUser,
  LoginUser,
  LogoutUser,
  RefreshAccessToken,
  changeCurrentPassword,  
  currentUser,
  updateAccountDetails,
  updateAvatar,
  updatecoverImage,
  UserProfile,
  getwatchHistory
};
