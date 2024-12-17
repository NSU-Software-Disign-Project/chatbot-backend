import express from "express";
import { saveConfiguration, getConfiguration, deleteConfiguration, getAllConfigurations } from "../api/configurationController";


const router = express.Router();

router.post("/save-config", async (req, res) => {
    try {
        await saveConfiguration(req, res);
    } catch (error) {
        console.error("Error in saveConfiguration:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/get-config", async (req, res) => {
    try {
        await getConfiguration(req, res);
    } catch (error) {
        console.error("Error in getConfiguration:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/get-all", async (req, res) => {
  try {
      await getAllConfigurations(req, res);
  } catch (error) {
      console.error("Error in getAllConfigurations:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


router.delete("/delete-config", async (req, res) => {
    try {
        await deleteConfiguration(req, res);
    } catch (error) {
        console.error("Error in deleteConfiguration:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
