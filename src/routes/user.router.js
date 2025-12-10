import { Router } from "express";
import {upload} from "../middlewares/multure.middleware.js"
import {
    changeCurrentPassword,
    currentUser,
    getwatchHistory,
    LoginUser,
    LogoutUser,
    RefreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateAvatar,
    updatecoverImage,
    UserProfile
 } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),registerUser
)

router.route("/login").post(LoginUser)

router.route("/logout").post(verifyJWT,LogoutUser)

router.route("/refresh-token").post(verifyJWT,RefreshAccessToken)

router.route("/change-password").post(verifyJWT,changeCurrentPassword)

router.route("/currentUser").post(verifyJWT,currentUser)

router.route("/change-details").post(verifyJWT,updateAccountDetails)

router.route("/updateavatar").post(verifyJWT,upload.single("avatar"),updateAvatar)

router.route("/updatecoverImage").post(verifyJWT,upload.single("coverImage"),updatecoverImage)

router.route("/c/:username").get(verifyJWT,UserProfile)

router.route("/get-history").get(verifyJWT,getwatchHistory)

export default router