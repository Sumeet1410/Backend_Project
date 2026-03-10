import { Router } from "express"
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/create-playlist").post(verifyJWT,createPlaylist)
router.route("/user-playlist/:userId").get(getUserPlaylists)
router.route("/get-playlist/:playlistId").get(getPlaylistById)
router.route("/add-video/:playlistId/videos/:videoId").post(verifyJWT,addVideoToPlaylist)
router.route("/remove-video/:playlistId/videos/:videoId").delete(verifyJWT,removeVideoFromPlaylist)
router.route("/delete-playlist/:playlistId").delete(verifyJWT,deletePlaylist)
router.route("/update-playlist/:playlistId").patch(verifyJWT,updatePlaylist)
export default router;