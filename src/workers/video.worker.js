import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Worker } from "bullmq";
import { connection } from "../queue/queue.config.js";
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path || ffprobePath);
console.log("ffprobePath:", ffprobePath);
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};
import connectDB from "../db/index.js";

await connectDB();
const worker = new Worker(
    "video-processing",
    async (job)=>{

        const {videoId,videoPath,thumbnailPath} = job.data;
        console.log(videoPath);
        const duration=await getVideoDuration(videoPath);
        // console.log(duration)
        const videoFile=await uploadOnCloudinary(videoPath);
        // console.log(process.env.CLOUDINARY_CLOUD_NAME);
        // console.log(videoFile);
        const thumbnail=await uploadOnCloudinary(thumbnailPath);
        if(!videoFile || !thumbnail){
          throw new Error("Error uploading files to cloudinary")
        }
        const updatedVideo=await Video.findByIdAndUpdate(videoId,{
            $set:{
                videoFile :{
                    url:videoFile.url,
                    public_id:videoFile.public_id
                },
                thumbnail:{
                    url:thumbnail.url,
                    public_id:thumbnail.public_id
                },
                duration:duration,
                isPublished:true
            }
        })
        if(!updatedVideo) throw new Error("Video not found");

    },
    {connection}
);
worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job.id}`, err);
});