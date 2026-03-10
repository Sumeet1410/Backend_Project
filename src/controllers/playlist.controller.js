import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {Playlist} from "../models/playlist.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose"
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const userId = req.user._id;
    if(!name?.trim()){
        throw new ApiError(400,"Playlist name must not be empty")
    }
    const playlist=await Playlist.countDocuments({owner:userId,name:name})
    // console.log(playlist);
    if(playlist>0){
        throw new ApiError(400,"user cannot have two playlist with same name")
    }
    const createdPlaylist= await Playlist.create({
        name,
        description : description || "",
        videos:[],
        owner:userId
    })
    return res.status(200).json(
        new ApiResponse(200,createdPlaylist,"Playlist created")
    );

    //TODO: create playlist
})
const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    // const user= await User.findById(userId)
    // if(!user){
    //     throw new ApiError(404,"User not found");
    // } not reqd
    const userPlaylists= await Playlist.find({owner : userId});
    return res.status(200).json(
        new ApiResponse(200,userPlaylists,"User playlists fetched")
    )
})
const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist=await Playlist.findById(playlistId)
    .populate("videos")
    return res.status(200).json(
        new ApiResponse(200,playlist,"Playlist fetched successfully")
    )
})
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {videoId,playlistId}=req.params

    const userId=req.user._id
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    //My version
    // const playlist=await Playlist.findById(playlistId)
    // const video=await Video.findById(videoId)
    // if(!playlist){
    //     throw new ApiError(404,"Playlist not found");
    // }
    // if(!video){
    //     throw new ApiError(404,"Video not found");
    // }
    // if(playlist.owner.toString() !== userId.toString()){
    //     throw new ApiError(403,"Unauthorised access");
    // }
    // const alreadyExists=playlist.videos.some((id) =>
    //     id.equals(videoId)
    // );
    // if(alreadyExists){
    //     throw new ApiError(400,"Video already exists in playlist")
    // }
    // playlist.videos.push(videoId);

    //Chatgpt recommended
    const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
        _id: playlistId,
        owner: userId,
        videos: { $ne: videoId }
    },
    {
        $push: { videos: videoId }
    },
    { new: true }
);

if (!updatedPlaylist) {
    throw new ApiError(400, "Video already exists or unauthorized");
}
    
    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video added successfully")
    )
})
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {videoId,playlistId}=req.params

    const userId=req.user._id
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
        _id: playlistId,
        owner: userId,
        videos:  videoId 
    },
    {
        $pull: { videos: videoId }
    },
    { new: true }
);
    if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found, video not in playlist, or unauthorized");
}
    
    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video removed successfully")
    )

})
const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId}=req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const userId=req.user._id;
    const deletedPlaylist=await Playlist.findOneAndDelete({
        _id:playlistId,
        owner: userId
    })
    if(!deletedPlaylist){
        throw new ApiError(404,"Playlist not found or unauthorised access");
    }
    return res.status(200).json(
        new ApiResponse(200,{},"Playlist successfully deleted")
    )
})
const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId}=req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const {name, description} = req.body
    const userId=req.user._id
    if(!playlistId){
        throw new ApiError(400,"Invalid playlist id")
    }
    if(!name?.trim()){
        throw new ApiError(400,"Name cannot be empty");
    }
    const updateData = {
        name: name.trim()
    };

    // Only update description if it is provided
    if (description !== undefined) {
        updateData.description = description;
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: userId   // Security check
        },
        {
            $set: updateData
        },
        { new: true }
    );
    if(!updatedPlaylist){
        throw new ApiError(400,"Playlist not found or unauthorised access");
    }
    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Playlist updated successfully")
    )
})
export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}