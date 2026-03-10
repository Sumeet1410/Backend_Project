
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose"
const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    if(!content?.trim()){
        throw new ApiError(400,"Tweet cannot be empty");
    }
    const createdTweet = await Tweet.create({
        owner : req.user._id,
        content
    })
    return res.status(200).json(
        new ApiResponse(200,createdTweet,"Tweet successfully created")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    const userTweets= await Tweet.find({owner : userId}).select("-owner");
    return res.status(200).json(
        new ApiResponse(200,userTweets,"User tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const {content}=req.body;
    const {tweetId} = req.params
    
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    if(!content?.trim()){
        throw new ApiError(400,"Tweet cannot be empty")
    }
    
    const updatedTweet=await Tweet.findOneAndUpdate(
        {
            _id:tweetId,
            owner : req.user._id
        },
        {
            $set:{
                content:content
            }
        },
        {new : true}
    )
    if(!updatedTweet){
        throw new ApiError(404,"Tweet not found or invalid access")
    }
    return res.status(200).json(
        new ApiResponse(200,updatedTweet,"Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const deletedTweet= await Tweet.findOneAndDelete({
        _id : tweetId,
        owner:req.user._id
    })
    if(!deletedTweet){
        throw new ApiError(404,"Tweet not found or invalid access");
    }
    await Like.deleteMany({tweet : tweetId});
    return res.status(200).json(
        new ApiResponse(200,{},"Tweet deleted successfully")
    )
})
export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}