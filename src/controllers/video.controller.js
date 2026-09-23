    import ffmpeg from "fluent-ffmpeg";
    import ffmpegPath from "ffmpeg-static";
    import ffprobePath from "ffprobe-static";
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath.path);
    import path from "path";
    import { Video } from "../models/video.model.js";
    import { User } from "../models/user.model.js";
    import { ApiError } from "../utils/ApiError.js";
    import { ApiResponse } from "../utils/ApiResponse.js";
    import { asyncHandler } from "../utils/asyncHandler.js";
    import { uploadOnCloudinary } from "../utils/cloudinary.js";
    import fs from "fs";
    import { Like } from "../models/like.model.js";
    import { Comment } from "../models/comment.model.js";
    import {Playlist} from "../models/playlist.model.js"
    import mongoose from "mongoose"
    import {v2 as cloudinary} from "cloudinary"
    import redisClient from "../utils/redis.js"
    import { enqueueVideoProcessing } from "../queue/video.producer.js";

    const clearVideoListCache = async (username) => {
        const patterns = [
            `videos:${username}:*`,
            `videos:user:${username}:*`,
            `videos:all:*`
        ];
        for (const pattern of patterns) {
            const matchedKeys = await redisClient.keys(pattern);
            if (matchedKeys.length > 0) {
                await redisClient.del(matchedKeys);
            }
        }
    };
    const getAllVideosByUser = asyncHandler(async (req, res) => {
        let { page = 1, limit = 10, query, sortBy, sortType, username } = req.query;
        if (!username?.trim()) {
            throw new ApiError(400, "Username is required to fetch user videos");
        }
        const user = await User.findOne({ username });
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        sortBy = sortBy || "createdAt";
        sortType = sortType === "asc" ? 1 : -1;
        let filter = { owner: user._id };
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
            .sort({ [sortBy]: sortType });
        const totalVideoCount = await Video.countDocuments(filter);
        return res.status(200).json(new ApiResponse(200, {
            videos,
            page,
            limit,
            sortBy,
            sortType,
            totalVideoCount
        }));
    });

    const getAllVideos = asyncHandler(async (req, res) => {
        let { page = 1, limit = 10, query, sortBy, sortType } = req.query;
        sortBy = sortBy || "createdAt";
        sortType = sortType === "asc" ? 1 : -1;
        let filter = { isPublic: { $ne: false } };
        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ];
        }
        page = Math.max(parseInt(page) || 1, 1);
        limit = Math.max(parseInt(limit) || 10, 1);
        const skip = (page - 1) * limit;
        const videos = await Video.find(filter)
            .populate("owner")
            .skip(skip)
            .limit(limit)
            .sort({ [sortBy]: sortType });
        const totalVideoCount = await Video.countDocuments(filter);
        return res.status(200).json(new ApiResponse(200, {
            videos,
            page,
            limit,
            sortBy,
            sortType,
            totalVideoCount
        }));
    });
    // const getVideoDuration = (filePath) => {
    // return new Promise((resolve, reject) => {
    //     ffmpeg.ffprobe(filePath, (err, metadata) => {
    //     if (err) return reject(err);
    //     resolve(metadata.format.duration);
    //     });
    // });
    // };
    const publishAVideo = asyncHandler(async (req, res) => {
        const { title, description } = req.body;
        let { isPublic } = req.body;
        if(!title || !description ){
            throw new ApiError(400,"Missing title or description");
        }
        // console.log(isPublic);
        if(!isPublic) isPublic=false;
        else if(isPublic=="true") isPublic=true;
        else isPublic=false;
        // console.log(isPublic);
        const videoFileLocalPath = req.files?.videoFile?.[0]?.path ? path.resolve(req.files.videoFile[0].path) : null;
        const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path ? path.resolve(req.files.thumbnail[0].path) : null;
        if(!videoFileLocalPath || !thumbnailLocalPath){
            throw new ApiError(400,"Missing video file or thumbnail");
        }
        // const duration=await getVideoDuration(videoFileLocalPath)
        // const videoFile=await uploadOnCloudinary(videoFileLocalPath);
        // const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);
        // if(!videoFile?.url || !thumbnail?.url){
        //     throw new ApiError(500,"Error occured while uploading to database");
        // }
        

        // console.log("Exists:", fs.existsSync(videoFileLocalPath));
        // console.log("Video path:", videoFileLocalPath);
        // console.log(typeof req.user?._id)
        const video=await Video.create({
            // thumbnail:{
            //     url:thumbnail.url,
            //     public_id:thumbnail.public_id
            // },
            // videoFile:{
            //     url:videoFile.url,
            //     public_id:videoFile.public_id
            // },
            title,
            description,
            // duration,
            isPublic,
            owner:req.user._id,
            isPublished:false
        })
        // if(!video){
        //     throw new ApiError(500,"Error occured during publishing video")
        // }
        let success = false;
        try {
            success = await enqueueVideoProcessing({
                videoId: video._id,
                videoPath: videoFileLocalPath,
                thumbnailPath: thumbnailLocalPath
            });
        } catch (queueErr) {
            await Video.findByIdAndDelete(video._id);
            throw new ApiError(500, queueErr?.message || "Failed to start processing");
        }
        if(!success){
            await Video.findByIdAndDelete(video._id);
            throw new ApiError(500,"Failed to start processing");
        }
        await clearVideoListCache(req.user.username);
        const channelStatKeys=await redisClient.keys(`channelStats:${req.user._id}`);
        if(channelStatKeys.length>0){
            await redisClient.del(channelStatKeys);
        }
        return res.status(200).json(new ApiResponse(200,video,"Video publishing process started"));    
    });

    const getVideoById = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }
        const video = await Video.findById(videoId).populate("owner", "username fullName avatar");
        if(!video){
            throw new ApiError(404,"Video not found");
        }
        if(!video.isPublic && video.owner._id.toString() !== req.user?._id?.toString()){
            throw new ApiError(400, "Video has been made private by the owner");
        }
        return res.status(200).json(
            new ApiResponse(200,video,"Video found")
        );
    })

    const updateVideo = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        
        const userId = req.user._id;
        const { title , description } = req.body;
        const thumbnailLocalPath  = req.file?.path;
        if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
            throw new ApiError(400, "Nothing to update");
        }
        if(!videoId){
            throw new ApiError(400,"Invalid video id");
        }
        const video = await Video.findById(videoId);
        if(!video){
            throw new ApiError(404,"Video not found");
        }
        if(video.owner.toString() !== userId.toString()){
            throw new ApiError(403,"Invalid access request");
        }
        
        let thumbnail;
        if(thumbnailLocalPath){
            thumbnail=await uploadOnCloudinary(thumbnailLocalPath);
            if(!thumbnail?.url){
                throw new ApiError(500,"Error occured while uploading thumbnail");
            }
            await cloudinary.uploader.destroy(
            video.thumbnail.public_id
            );
            video.thumbnail={
            url:thumbnail.url,
            public_id:thumbnail.public_id
            }
        }
        if(title?.trim()) video.title=title;
        if(description?.trim()) video.description=description;
        await video.save();
        // const updatedVideo= await Video.findOneAndUpdate({
        //     _id:videoId,
        //     owner:userId
        // },{
        //     $set: changes
        // },
        // {new : true}
        // )
        await redisClient.del(`video:${videoId}`);
        await clearVideoListCache(req.user.username);
        return res.status(200).json(new ApiResponse(200,video,"Video updated successfully"))
        
    })

    const deleteVideo = asyncHandler(async (req, res) => {
        // const { videoId } = req.params
        const { videoId } = req.params
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }
        const userId=req.user._id;
        const deletedVideo=await Video.findOneAndDelete({
            _id : videoId,
            owner: userId
        });
        if(!deletedVideo){
            throw new ApiError(404,"Video not found or invalid access");
        }
        if (deletedVideo.videoFile?.public_id) {
            await cloudinary.uploader.destroy(
                deletedVideo.videoFile.public_id,
                { resource_type: "video" }
            );
        }

        if (deletedVideo.thumbnail?.public_id) {
            await cloudinary.uploader.destroy(
                deletedVideo.thumbnail.public_id
            );
        }
        await User.updateMany({
            watchHistory : videoId
        },
        {
            $pull : { watchHistory : videoId}
        }
        )
        // Delete likes on all comments belonging to this video before deleting the comments
        const comments = await Comment.find({ video: videoId }).select('_id');
        const commentIds = comments.map((comment) => comment._id);
        if (commentIds.length > 0) {
            await Like.deleteMany({ comment: { $in: commentIds } });
        }
        await Like.deleteMany({video : videoId})
        await Comment.deleteMany({video : videoId})
        await Playlist.updateMany({videos : videoId},{
            $pull : {videos : videoId}
        })
        await redisClient.del(`video:${videoId}`);

        await clearVideoListCache(req.user.username);

        const commentKeys=await redisClient.keys(`comments:${videoId}:*`)
        if(commentKeys.length>0){
            await redisClient.del(commentKeys);
        }
        await redisClient.del(`channelStats:${req.user._id}`)
        return res.status(200).json(new ApiResponse(200,{},"Video deleted"));
    })

    const togglePublishStatus = asyncHandler(async (req, res) => {
        const { videoId } = req.params
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }
        const userId=req.user._id;
        const video = await Video.findById(videoId);
        if(!video){
            throw new ApiError(404,"Video not found");
        }
        if(video.owner.toString() !== userId.toString()){
            throw new ApiError(403,"Invalid access request");
        }
        video.isPublic=(!video.isPublic);
        await video.save();
        //below method is diff to use where value in db is needed to update
        // const updatedVideo=await Video.findOneAndUpdate({
        //     _id:videoId,
        //     owner:userId
        // },
        // [{$set : {
        //     isPublic : {$not : "$isPublic"}
        // }}]
        // )
        // if(!updatedVideo){
        //     throw new ApiError(404,"Video not found or invalid access");
        // }
        await redisClient.del(`video:${videoId}`);
        await clearVideoListCache(req.user.username);
        return res.status(200).json(new ApiResponse(200,video,"Publish status updated"));

    })
    const watchVideo = asyncHandler(async(req,res)=>{
        const { videoId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }
        const userId=req.user._id;
        const video = await Video.findById(videoId).populate("owner", "username");
        if(!video){
            throw new ApiError(404,"Video not found");
        }
        if(!video.isPublic){
            throw new ApiError(400,"Video has been made private by the owner");
        }
        await Video.findByIdAndUpdate(videoId, {
            $inc: { views: 1 }
        });
        await User.findByIdAndUpdate(userId, {
            $pull: { watchHistory: videoId }
        });
        await User.findByIdAndUpdate(userId, {
            $push: {
                watchHistory: {
                    $each: [videoId],
                    $position: 0
                }
            }
        });
        await redisClient.del(`video:${videoId}`);

        await clearVideoListCache(video.owner?.username || req.user.username);
        await redisClient.del(`watchHistory:${req.user._id}`);
        await redisClient.del(`channelStats:${video.owner?._id || video.owner}`);
        return res.status(200).json(new ApiResponse(200,video,"Details updated successfully"));
    })
    export { publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus, watchVideo, getAllVideos, getAllVideosByUser, clearVideoListCache };