import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    deleteVideo,
     getAllVideos,
     getvideoById,
     publishAVideo, 
     publishToggle, 
     updateVideo
    } from "../controllers/video.controller.js";

import {upload} from "../middlewares/multure.middleware.js"

const router = Router()

router.use(verifyJWT)

// ======================================================================================

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

// ======================================================================================

router.route("/:videoId")
.get(getvideoById)
.patch(upload.single("thumbnail"),updateVideo)
.delete(deleteVideo)

// ======================================================================================

router.route("/toggle/:videoId").patch(publishToggle)

export default router