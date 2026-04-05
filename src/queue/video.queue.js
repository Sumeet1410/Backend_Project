import { Queue } from "bullmq"
import { connection } from "./queue.config.js"
export const videoQueue = new Queue("video-processing",
    {
        connection
    }
)