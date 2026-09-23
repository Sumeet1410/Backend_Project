import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose"
const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId}=req.params
    const user=req.user._id
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video= await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"invalid video id");
    }
    const deletedlike=await Like.findOneAndDelete(
        {likedBy: user,video:videoId}
    )
    if(!deletedlike){
        const addedLike = await Like.create({
            likedBy: user,
            video:videoId
        })
        return res.status(200).json(
            new ApiResponse(200,{},"Video liked")
        );
    }
    else return res.status(200).json(
        new ApiResponse(200,{},"Like removed")
    );
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId}=req.params

    const user=req.user._id
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const comment= await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(404,"comment not found");
    }
    const deletedlike=await Like.findOneAndDelete(
        {likedBy: user,comment:commentId}
    )
    if(!deletedlike){
        const addedLike = await Like.create({
            likedBy: user,
            comment:commentId
        })
        return res.status(200).json(
            new ApiResponse(200,{},"comment liked")
        );
    }
    else return res.status(200).json(
        new ApiResponse(200,{},"Like removed")
    );
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId}=req.params

    const user=req.user._id
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const tweet= await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404,"Tweet not found");
    }
    const deletedlike=await Like.findOneAndDelete(
        {likedBy: user,tweet:tweetId}
    )
    if(!deletedlike){
        const addedLike = await Like.create({
            likedBy: user,
            tweet:tweetId
        })
        return res.status(200).json(
            new ApiResponse(200,{},"tweet liked")
        );
    }
    else return res.status(200).json(
        new ApiResponse(200,{},"Like removed")
    );
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const user = req.user._id;
    const likes = await Like.find({
        likedBy: user,
        video: { $ne: null }
    }).populate({
        path: "video",
        populate: {
            path: "owner"
        }
    });

    const videos = likes
        .map((like) => like.video)
        .filter((video) => video !== null && video !== undefined);

    return res.status(200).json(
        new ApiResponse(200, videos, "All videos liked by the user fetched")
    );
});

const isCommentLiked = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const like = await Like.findOne({ likedBy: userId, comment: commentId });

    return res.status(200).json(
        new ApiResponse(200, { isLiked: !!like }, "Comment like status fetched successfully")
    );
});

const isTweetLiked = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const like = await Like.findOne({ likedBy: userId, tweet: tweetId });

    return res.status(200).json(
        new ApiResponse(200, { isLiked: !!like }, "Tweet like status fetched successfully")
    );
});

const getVideoLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const likes = await Like.find({ video: videoId }).populate("likedBy", "fullName username avatar");
    const isLiked = req.user?._id
        ? likes.some((like) => like.likedBy?._id?.toString() === req.user._id.toString() || like.likedBy?.toString() === req.user._id.toString())
        : false;

    return res.status(200).json(
        new ApiResponse(200, {
            likesCount: likes.length,
            isLiked,
            likes
        }, "Video likes fetched successfully")
    );
});

const getCommentLikes = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    const likes = await Like.find({ comment: commentId }).populate("likedBy", "fullName username avatar");
    const isLiked = req.user?._id
        ? likes.some((like) => like.likedBy?._id?.toString() === req.user._id.toString() || like.likedBy?.toString() === req.user._id.toString())
        : false;

    return res.status(200).json(
        new ApiResponse(200, {
            likesCount: likes.length,
            isLiked,
            likes
        }, "Comment likes fetched successfully")
    );
});

const getTweetLikes = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const likes = await Like.find({ tweet: tweetId }).populate("likedBy", "fullName username avatar");
    const isLiked = req.user?._id
        ? likes.some((like) => like.likedBy?._id?.toString() === req.user._id.toString() || like.likedBy?.toString() === req.user._id.toString())
        : false;

    return res.status(200).json(
        new ApiResponse(200, {
            likesCount: likes.length,
            isLiked,
            likes
        }, "Tweet likes fetched successfully")
    );
});

export {
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    getLikedVideos,
    isCommentLiked,
    isTweetLiked,
    getVideoLikes,
    getCommentLikes,
    getTweetLikes,
};