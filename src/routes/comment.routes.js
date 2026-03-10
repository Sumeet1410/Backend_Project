import { addComment, deleteComment, updateComment } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express"
const router = Router();
router.route("/add-comment/:videoId").post(verifyJWT,addComment)
router.route("/delete-comment/:commentId").delete(verifyJWT,deleteComment)
router.route("/update-comment/:commentId").patch(verifyJWT,updateComment)


export default router;