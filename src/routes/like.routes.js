import { Router } from "express"
import {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    isCommentLiked,
    isTweetLiked,
    getVideoLikes,
    getCommentLikes,
    getTweetLikes
} from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router();
router.route("/toggle-video-like/:videoId").post(verifyJWT,toggleVideoLike)
router.route("/toggle-comment-like/:commentId").post(verifyJWT,toggleCommentLike)
router.route("/toggle-tweet-like/:tweetId").post(verifyJWT,toggleTweetLike)
router.route("/get-liked-videos").get(verifyJWT,getLikedVideos)
router.route("/is-comment-liked/:commentId").get(verifyJWT,isCommentLiked)
router.route("/is-tweet-liked/:tweetId").get(verifyJWT,isTweetLiked)

router.route("/video/:videoId").get(verifyJWT, getVideoLikes)
router.route("/comment/:commentId").get(verifyJWT, getCommentLikes)
router.route("/tweet/:tweetId").get(verifyJWT, getTweetLikes)

export default router;