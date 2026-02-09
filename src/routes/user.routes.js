import {Router} from 'express';
import {loginUser, registerUser,logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage} from '../controllers/user.controller.js';
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router=Router();
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
    ])
    ,
    registerUser

)
router.post("/login", upload.fields([]), loginUser);

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/get-user").post(verifyJWT,getCurrentUser)
router.route("/update-details").post(verifyJWT,updateAccountDetails)
router.route("/update-avatar").post(upload.single("avatar"),verifyJWT,updateUserAvatar)
router.route("/update-coverImage").post(upload.single("coverImage"),verifyJWT,updateUserCoverImage);
export default router;