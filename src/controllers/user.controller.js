import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadfileonCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";
import jwt  from "jsonwebtoken";

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

export { registerUser, LoginUser , LogoutUser , RefreshAccessToken};
