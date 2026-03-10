import mongoose,{ Schema } from "mongoose";
const playlistSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    videos:[{
        type:mongoose.Schema.ObjectId,
        ref:"Video"
    }],
    owner:{
        type:mongoose.Schema.ObjectId,
        ref:"User"
    }
},{timestamps:true})
export const Playlist=mongoose.model("Playlist",playlistSchema);