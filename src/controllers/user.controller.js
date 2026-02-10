import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import {  ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose,{ Aggregate } from 'mongoose';
const generateAccessAndRefreshTokens = async (userId) =>{
    const user = await User.findById(userId);
    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();
    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});
    return {accessToken,refreshToken};
}
const registerUser = asyncHandler(async(req,res) =>{
    //get user detials from front end
    const {fullName,email,username,password}=req.body;
    //validation
    if([fullName,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }
    const emailRegex=/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if(!emailRegex.test(email)){
        throw new ApiError(400,"Invalid email address")
    }
    //check if unique
    const existedUser = await User.findOne({
        $or : [{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists")
    }
    //check for images,avatars
    const avatarLocalPath=req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    //upload to cloudinary, check for avatar
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }
    //create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username : username.toLowerCase(),
        password
    })
    //remove password and refresh token from response
    const createdUser= await User.findById(user._id).select(
        '-password -refreshToken'
    )
    //check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering user")

    }
    //return res
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
    
    //console.log(req.files);
    
    //console.log(username);
    
    
    
    
    
    
})
const loginUser=asyncHandler(async(req,res)=>{
    //get user details
    console.log("REQ BODY:", req.body);

    if (!req.body) {
        throw new ApiError(400, "Body not received");
    }

    const { email, username, password } = req.body;

    if(!email && !username){
        throw new ApiError(400,"Email or username is required")
    }
    //check if exists in database(username or email)
    const user = await User.findOne({
        $or: [{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist");
    }
    //compare password
    const isPasswordValid= await user.isPassWordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid credentials")
    }
    //genreate refresh and access tokens
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
    //send cookies
    const loggedInUser=await User.findById(user._id).select(
        '-password -refreshToken'
    )

    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,accessToken,
                refreshToken
            },
            "User Logged in successfully"
        )
    )

})
const logoutUser=asyncHandler(async(req,res)=>{
    //console.log(req.cookies);
    await User.findByIdAndUpdate(req.user._id,{
        $unset:{
            refreshToken:1
        }
    },
        {
            new: true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})
const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorised request");
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
        console.log(user.username);
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Expired or used")
        }
        const options={
            secure:true,
            httpOnly:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access Token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
    console.log(req.body)
    const {oldPassword,newPassword}=req.body;
    if(!oldPassword || !newPassword){
        throw new ApiError(400,"Old password and new password are required")
    } 
    const user=await User.findById(req.user._id)
    const isPasswordCorrect=await user.isPassWordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Incorrect Password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200).json(new ApiResponse(200,{},"Password Updated Successfully"))
})
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})
const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName || !email){
        throw new ApiError(400,"Both the fields are required")
    }
    const updatedUser=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new : true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,updatedUser,"details updated successfully"))

})
const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading to cloudinary")
    }
    const updatedUser=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new : true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,updatedUser,"Avatar updated Successfully"))
})
const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"cover image file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading to cloudinary")
    }
    const updatedUser=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new : true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,updatedUser,"Cover image updated Successfully"))
})
const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username} = req.params;
    console.log(req.params)
    if(!username?.trim()){
        throw new ApiError(400,"Invalid username")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in :[req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }
    return res.
    status(200).
    json(
        new ApiResponse(200,channel[0],"Channel data fetched successfully")
    )
})
const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully")
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory   
};

