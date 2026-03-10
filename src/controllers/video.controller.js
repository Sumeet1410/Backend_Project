import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);
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
const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, username } = req.query
    if(!username?.trim()){
        throw new ApiError(400,"Invalid user id");
    }
    const user= await User.findOne({username});
    if(!user){
        throw new ApiError(404,"user not found");
    }
    // console.log(typeof user._id);
    sortBy = sortBy || "createdAt";
    sortType = sortType==="asc" ? 1 : -1;
    let filter = { owner: user._id };
    if (query) {    
        filter.title = { $regex: query, $options: "i" };
    }
    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);
    const skip=(page-1)*limit;
    const videos=await Video.find(filter)
    .populate("owner")
    .skip(skip)
    .limit(limit)   
    .sort({ [sortBy]: sortType})
    const totalVideoCount=await Video.countDocuments(filter)
    return res.status(200)
    .json(new ApiResponse(200,{
        videos,
        page,
        limit,
        sortBy,
        sortType,
        totalVideoCount
    }));
    //TODO: get all videos based on query, sort, pagination
})
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};
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
    const videoFileLocalPath=req.files?.videoFile[0]?.path;
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path;
    if(!videoFileLocalPath || !thumbnailLocalPath){
        throw new ApiError(400,"Missing video file or thumbnail");
    }
    const duration=await getVideoDuration(videoFileLocalPath)
    const videoFile=await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);
    if(!videoFile?.url || !thumbnail?.url){
        throw new ApiError(500,"Error occured while uploading to database");
    }
    

    // console.log("Exists:", fs.existsSync(videoFileLocalPath));
    // console.log("Video path:", videoFileLocalPath);
    // console.log(typeof req.user?._id)
    const video=await Video.create({
        thumbnail:{
            url:thumbnail.url,
            public_id:thumbnail.public_id
        },
        videoFile:{
            url:videoFile.url,
            public_id:videoFile.public_id
        },
        title,
        description,
        duration,
        isPublic,
        owner:req.user._id
    })
    if(!video){
        throw new ApiError(500,"Error occured during publishing video")
    }
    return res.status(200).json(new ApiResponse(200,video,"Video Published successfully"));    
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    // console.log(videoId)
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found");
    }
    return res.status(200).json(
        new ApiResponse(200,video,"Video found")
    );
    //TODO: get video by id
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
    if(video.owner.toString()!=userId.toString()){
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
    await cloudinary.uploader.destroy(
        deletedVideo.videoFile.public_id,
        { resource_type: "video" }
    );

    await cloudinary.uploader.destroy(
        deletedVideo.thumbnail.public_id
    );
    await User.updateMany({
        watchHistory : videoId
    },
    {
        $pull : { watchHistory : videoId}
    }
    )
    await Like.deleteMany({video : videoId})
    await Comment.deleteMany({video : videoId})
    await Playlist.updateMany({videos : videoId},{
        $pull : {videos : videoId}
    })
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
    if(video.owner.toString()!=userId.toString()){
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
    return res.status(200).json(new ApiResponse(200,video,"Publish status updated"));

})
const watchVideo = asyncHandler(async(req,res)=>{
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    // console.log(videoId);
    const userId=req.user._id;
     if(!videoId){
        throw new ApiError(400,"Invalid video id");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found");
    }
    if(!video.isPublic){
        throw new ApiError(400,"Video has been made private by the owner");
    }
    video.views++;
    await User.findByIdAndUpdate(userId, {
        $push: { watchHistory: videoId }
    });
    await video.save();
    return res.status(200).json(new ApiResponse(200,video,"Details updated successfully"));
})
export {publishAVideo,getVideoById,updateVideo,deleteVideo,togglePublishStatus,watchVideo,getAllVideos}