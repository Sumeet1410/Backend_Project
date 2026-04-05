import {publishAVideo,getVideoById,updateVideo,deleteVideo,togglePublishStatus,watchVideo,getAllVideos} from "../controllers/video.controller.js";
import { getVideoComments } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js";
import cache from "../middlewares/redis.middleware.js";
import { getUploadLimiter } from "../middlewares/rateLimit.middleware.js";
const uploadLimiter = (req, res, next) => {
  const limiter = getUploadLimiter();
  return limiter(req, res, next);
};
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
    ]),uploadLimiter,publishAVideo
)
// router.route("/get-video/:videoId").get(getVideoById);
router.get(
  "/get-video/:videoId",
  cache((req) => `video:${req.params.videoId}`, 300),
  getVideoById
);
router.route("/update-video/:videoId").patch(verifyJWT,upload.single("thumbnail"),updateVideo);
router.route("/delete-video/:videoId").delete(verifyJWT,deleteVideo);
router.route("/toggle-status/:videoId").patch(verifyJWT,togglePublishStatus);
router.route("/watch/:videoId").patch(verifyJWT,watchVideo);
router.route("/:videoId/comments").get(
  cache((req) => {
    const { videoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    return `comments:${videoId}:${page}:${limit}`;
}, 120),
  getVideoComments)
router.get(
  "/all-videos",
  cache((req) => {
    const { page=1, limit=10, query="", sortBy="createdAt", sortType="desc", username="" } = req.query;

    return `videos:${username}:${page}:${limit}:${query}:${sortBy}:${sortType}`;
  }, 300),
  getAllVideos
);
export default router;