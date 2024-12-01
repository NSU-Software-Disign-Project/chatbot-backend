import express from "express";
import { saveConfiguration, getConfiguration, deleteConfiguration, getAllConfigurations } from "../controllers/configurationController";


const router = express.Router();
router.post("/save-config", saveConfiguration);
router.get("/get-config", getConfiguration);
router.get("/get-all", getAllConfigurations);
router.delete("/delete-config", deleteConfiguration);

export default router;
