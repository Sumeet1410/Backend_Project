import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import redisClient from "../utils/redis.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const userId = req.user._id;
    if (channelId.toString() === userId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channelUser = await User.findById(channelId).select("username");
    if (!channelUser) {
        throw new ApiError(404, "Channel not found");
    }

    // 1. Toggle in MongoDB first so subscription state is always persisted
    const deletedSubscription = await Subscription.findOneAndDelete({
        subscriber: userId,
        channel: channelId
    });

    let createdSubscription = null;
    let isSubscribed = false;

    if (!deletedSubscription) {
        createdSubscription = await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        isSubscribed = true;
    }

    // 2. Safely invalidate Redis cache keys (never crash if empty or redis error)
    try {
        const channelUsername = channelUser.username?.toLowerCase();
        const subscriberUsername = req.user.username?.toLowerCase();

        const keys1 = channelUsername ? await redisClient.keys(`channel:${channelUsername}:*`) : [];
        const keys2 = subscriberUsername ? await redisClient.keys(`channel:${subscriberUsername}:*`) : [];
        const allKeys = [...new Set([...keys1, ...keys2])];

        if (allKeys.length > 0) {
            await redisClient.del(allKeys);
        }
        await redisClient.del(`channelStats:${channelUser._id}`);
    } catch (cacheErr) {
        console.error("Redis cache invalidation error in toggleSubscription:", cacheErr);
    }

    if (isSubscribed) {
        return res.status(200).json(
            new ApiResponse(200, { isSubscribed: true, subscription: createdSubscription }, "Subscribed to the channel")
        );
    } else {
        return res.status(200).json(
            new ApiResponse(200, { isSubscribed: false, deletedSubscription }, "Unsubscribed from the channel")
        );
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    const subscriptions = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username fullName avatar coverImage")
        .select("subscriber -_id");

    const subscribers = subscriptions.map((sub) => sub.subscriber).filter(Boolean);

    return res.status(200).json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id");
    }
    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
        throw new ApiError(404, "User not found");
    }
    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username fullName avatar coverImage")
        .select("channel -_id");

    const subscribedChannels = subscriptions.map((sub) => sub.channel).filter(Boolean);

    return res.status(200).json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};