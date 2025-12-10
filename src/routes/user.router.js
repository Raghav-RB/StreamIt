import { Router } from "express";
import {upload} from "../middlewares/multure.middleware.js"
import { LoginUser, LogoutUser, RefreshAccessToken, registerUser } from "../controllers/user.controller.js";
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

export default router