import { Comment } from "../models/comment.model.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose"
import redisClient from "../utils/redis.js"
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId}=req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    
    let {page = 1, limit = 10} = req.query
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found");
    }
    page=parseInt(page);
    limit=parseInt(limit);
    const skip=(page-1)*limit;
    const comments= await Comment.find({video : videoId})
    .populate("owner")
    .sort({createdAt : -1})
    .skip(skip)
    .limit(limit);
    const totalCommentCount = await Comment.countDocuments({video : videoId});
    return res
    .status(200)
    .json(new ApiResponse(200,{
        success:true,
        page,
        limit,
        totalCommentCount,
        totalPages : Math.ceil(totalCommentCount/limit),
        data: comments
    },"Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const ownerId=req.user._id;
    const {videoId}=req.params
    const { content }=req.body
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    if(!content?.trim()){
        throw new ApiError(400,"Empty comment not allowed");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found.");
    }
    const comment=await Comment.create({
        content,
        video:videoId,
        owner:ownerId
    }); 
    const keys=await redisClient.keys(`comments:${videoId}:*`)
    if(keys.length>0){
        await redisClient.del(keys);
    }
    return res.status(200).json(
        new ApiResponse(200,comment,"Comment added succesfully")
    );

})

const updateComment = asyncHandler(async (req, res) => {
    
    const {commentId}=req.params
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const userId=req.user._id;
    const { newContent }=req.body;
    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(404,"Comment not found");
    }
    if(comment.owner.toString()!=userId.toString()){
        throw new ApiError(403,"Invalid access request");
    }
    if(!newContent?.trim()){
        throw new ApiError(400,"Comment cannot be empty")
    }
    comment.content=newContent;
    await comment.save();
    const videoId=comment.video;
    const keys=await redisClient.keys(`comments:${videoId}:*`)
    if(keys.length>0){
        await redisClient.del(keys);
    }
    return res.status(200).json(
        new ApiResponse(200,newContent,"updated successfully")
    )
    
    
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId}=req.params
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const userId=req.user._id;
    // if(!commentId){
    //     throw new ApiError(400,"Invalid comment id");
    // }
    // const comment = await Comment.findById(commentId);
    // if(!comment){
    //     throw new ApiError(404,"Comment not found");
    // }
    // const keys=await redisClient.keys(`comments:${comment.video}:*`)
    // if(keys.length>0){
    //     await redisClient.del(keys);
    // }
    // if(comment.owner.toString()!=userId.toString()){
    //     throw new ApiError(403,"Invalid access request");
    // }
    const deletedCommented=await Comment.findOneAndDelete({_id:commentId,owner:userId});
    if(!deletedCommented){
        throw new ApiError(404,"Comment not found or unauthorised request")
    }
    const videoId = deletedCommented.video;

    const keys = await redisClient.keys(`comments:${videoId}:*`);
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
    await Like.deleteMany({
        comment:commentId
    })
    
    return res.status(200).json(
        new ApiResponse(200,{},"Comment deleted")
    );
})
export {
    addComment,
    updateComment,
    deleteComment,
    getVideoComments
}