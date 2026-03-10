import {publishAVideo,getVideoById,updateVideo,deleteVideo,togglePublishStatus,watchVideo} from "../controllers/video.controller.js";
import { getVideoComments } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();
router.route("/publish-video").post(verifyJWT,
    upload.fields([
        {
            name : "videoFile",
            maxCount:1
        },
        {
            name:"thumbnail",
            maxCount:1
        }
    ]),publishAVideo
)
router.route("/get-video/:videoId").get(getVideoById);
router.route("/update-video/:videoId").patch(verifyJWT,upload.single("thumbnail"),updateVideo);
router.route("/delete-video/:videoId").delete(verifyJWT,deleteVideo);
router.route("/toggle-status/:videoId").patch(verifyJWT,togglePublishStatus);
router.route("/watch/:videoId").patch(verifyJWT,watchVideo);
router.route("/:videoId/comments").get(getVideoComments)
export default router;