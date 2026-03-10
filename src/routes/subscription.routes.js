import Router from "express"
import mongoose from "mongoose"
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router();
router.route("/toggle/:channelId").post(verifyJWT,toggleSubscription);
router.route("/get-subscribers/:channelId").get(getUserChannelSubscribers);
router.route("/get-subscribed/:subscriberId").get(getSubscribedChannels);
export default router;  