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
export const Like=mongoose.model("Like",likeSchema)