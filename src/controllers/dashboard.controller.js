import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose";
const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    //check for valid and existing user
    const { userId } = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    //to get total videos,views and likes iterate through Videos with owner=userId
    const stats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" }
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: "$likeCount" }
            }
        }
    ]);
    //to get subscribers iterate through Subscribers with channel=userId
    const subscriberCount = await Subscription.countDocuments({ channel: userId })
    return res.status(200).json(new ApiResponse(200, {
        totalVideos: stats[0]?.totalVideos || 0,
        totalViews: stats[0]?.totalViews || 0,
        totalLikes: stats[0]?.totalLikes || 0,
        subscriberCount
    }, "Channel stats fetched successfully")
    );

})

const getChannelVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType } = req.query
    const { userId } = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "user not found");
    }
    sortBy = sortBy || "createdAt";
    sortType = sortType === "asc" ? 1 : -1;
    let filter = { owner: userId };
    if (query) {
        filter.title = { $regex: query, $options: "i" };
    }
    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);
    const skip = (page - 1) * limit;
    const videos = await Video.find(filter)
        .populate("owner")
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortType })
    const totalVideoCount = await Video.countDocuments(filter)
    return res.status(200)
        .json(new ApiResponse(200, {
            videos,
            page,
            limit,
            sortBy, 
            sortType,
            totalVideoCount
        }));
})
export { getChannelStats, getChannelVideos };
