import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
     getAllVideos,
     getvideoById,
     publishAVideo, 
     updateVideo
    } from "../controllers/video.controller.js";

import {upload} from "../middlewares/multure.middleware.js"

const router = Router()

router.use(verifyJWT)

router.route("/")
.get(getAllVideos)
.post(upload.fields([
        {
            name:"videoFile",
            maxCount:1
        },
        {
            name:"thumbnail",
            maxCount:1
        }
    ]),
    publishAVideo
)

router.route("/:videoId")
.get(getvideoById)
.post(upload.single("thumbnail"),updateVideo)


export default router