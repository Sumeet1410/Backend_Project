import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";   
dotenv.config({
  path: "./env",
});
// console.log("🔥🔥🔥 THIS SERVER FILE IS RUNNING 🔥🔥🔥");
// process.exit(1);
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT   || 8000}`);
    });
  })
  .catch((err) => {
    console.log("Error in connecting to DB: ", err);
  });
