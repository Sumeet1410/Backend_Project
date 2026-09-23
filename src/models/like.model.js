import mongoose,{ Schema } from "mongoose";
const likeSchema=Schema({
    likedBy:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    },
    video:{
        type:mongoose.Types.ObjectId,
        ref:"Video"
    },
    comment:{
        type:mongoose.Types.ObjectId,
        ref:"Comment"
    },
    tweet:{
        type:mongoose.Types.ObjectId,
        ref:"Tweet"
    }
},{timestamps:true})

likeSchema.index({ video: 1, likedBy: 1 });
likeSchema.index({ comment: 1, likedBy: 1 });
likeSchema.index({ tweet: 1, likedBy: 1 });

export const Like=mongoose.model("Like",likeSchema)