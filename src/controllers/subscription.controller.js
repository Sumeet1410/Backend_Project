import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose"
const toggleSubscription = asyncHandler(async (req, res) => {
    const channelId=new mongoose.Types.ObjectId(req.params.channelId)
    // TODO: toggle subscription
    if(!channelId){
        throw new ApiError(400,"invalid user id");
    }
    const userId=req.user._id;
    const deletedSubscription=await Subscription.findOneAndDelete({
        subscriber : userId,
        channel : channelId
    })
    if(!deletedSubscription){
        const createdSubscription=await Subscription.create({
            subscriber:userId,
            channel:channelId
        })
        return res.status(200).json(
            new ApiResponse(200,createdSubscription,"Subscribed to the channel")
        )
    }
    else{
        return res.status(200).json(
            new ApiResponse(200,deletedSubscription,"Unsubscribed to the channel")
        )
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // const channelId=new mongoose.Types.ObjectId(req.params.channelId)
    const {channelId}=req.params
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const channel=await User.findById(channelId);
    if(!channel){
        throw new ApiError(404,"User not found");
    }
    const subscriptions=await Subscription.find({channel : channelId})
    .populate("subscriber","username")
    .select("subscriber -_id");
    const subscribers=subscriptions.map(sub => sub.subscriber)
    return res.status(200).json(
        new ApiResponse(200,subscribers,"Subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {subscriberId}=req.params
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const subscriber=await User.findById(subscriberId);
    if(!subscriber){
        throw new ApiError(404,"User not found");
    }
    const subscriptions=await Subscription.find({subscriber : subscriberId})
    .populate("channel","username")
    .select("channel -_id");
    const subscribedChannels=subscriptions.map(sub => sub.channel)
    return res.status(200).json(
        new ApiResponse(200,subscribedChannels,"Subscribers fetched successfully")
    )
})
export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}