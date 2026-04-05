import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema=new Schema({
    videoFile:{
        url:{
            type:String,
            // required:true
        },
        public_id:{
            type:String,
            // required:true
        },
    },
    thumbnail:{
        url:{
            type:String,
            // required:true
        },
        public_id:{
            type:String,
            // required:true
        },
    },
    
    title:{
        type:String, 
        required:true,
    },
    description:{
        type:String, 
        required:true,
    },
    duration:{
        type:Number, //cludinary url
        // required:true,
    },
    views:{
        type:Number,
        default:0
    },
    isPublic:{
        type:Boolean,
        default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    isPublished:{
        type:Boolean
    }
},{
    timestamps:true
}
);
videoSchema.plugin(mongooseAggregatePaginate);
export const Video=mongoose.model("Video",videoSchema)