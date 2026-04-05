import { videoQueue } from "./video.queue.js";
export const enqueueVideoProcessing= async(data) =>{
    try{
        await videoQueue.add("process-video",data,{
        jobId:`video-${data.videoId}`,
        attempts:3,
        backoff:{
            type:"exponential",
            delay:3000
        },
        removeOnComplete:true,
        removeOnFail:false
        });
        console.log("Job added to queue")
        return true

    }
    catch(error){
        console.error("Queue enqueue failed:",error);
        return false;
    }
}