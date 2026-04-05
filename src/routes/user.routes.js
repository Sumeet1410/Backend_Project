import {Router} from 'express';
import {loginUser, registerUser,logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from '../controllers/user.controller.js';
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getAllVideos } from '../controllers/video.controller.js';
import  cache  from "../middlewares/redis.middleware.js";
import { getAuthLimiter } from '../middlewares/rateLimit.middleware.js';
const router=Router();
const authLimiter = (req, res, next) => {
  const limiter = getAuthLimiter();
  return limiter(req, res, next);
};
router.route("/register").post(
    authLimiter,
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1  
        }
    ])
    ,
    registerUser

)
router.post("/login",authLimiter, upload.fields([]), loginUser);

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/get-channel/:username").get(verifyJWT,
    cache((req) => 
    `channel:${req.params.username}:${req.user?._id || "guest"}`
  , 300),
getUserChannelProfile)
router.route("/history").get(
  verifyJWT,
  cache((req) => `watchHistory:${req.user._id}`, 60),
  getWatchHistory
)
router.get("/videos", getAllVideos);
export default router