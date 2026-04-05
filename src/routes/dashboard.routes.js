import { Router } from "express"
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller.js";
import cache from "../middlewares/redis.middleware.js";
const router = Router();
router.route("/channel-stats/:userId").get(
    cache((req)=>`channelStats:${req.params.userId}`,60)
    ,getChannelStats)
router.route("/channel-videos/:userId").get(getChannelVideos)
export default router;