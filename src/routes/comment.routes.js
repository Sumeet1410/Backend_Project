import { addComment, deleteComment, updateComment } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express"
import { getCommentLimiter } from "../middlewares/rateLimit.middleware.js";
const commentLimiter = (req, res, next) => {
  const limiter = getCommentLimiter();
  return limiter(req, res, next);
};
const router = Router();
router.route("/add-comment/:videoId").post(verifyJWT,commentLimiter,addComment)
router.route("/delete-comment/:commentId").delete(verifyJWT,deleteComment)
router.route("/update-comment/:commentId").patch(verifyJWT,updateComment)


export default router;