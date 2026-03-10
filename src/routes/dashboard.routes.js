import { Router } from "express"
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller.js";
const router = Router();
router.route("/channel-stats/:userId").get(getChannelStats)
router.route("/channel-videos/:userId").get(getChannelVideos)
export default router;