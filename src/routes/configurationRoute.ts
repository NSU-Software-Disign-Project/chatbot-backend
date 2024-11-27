import express from 'express';
import {
  saveConfiguration,
  getConfiguration,
  deleteConfiguration,
} from '../controllers/configurationController';

const router = express.Router();
router.post('/save-config', saveConfiguration);
router.get('/get-config', getConfiguration);
router.delete('/delete-config', deleteConfiguration);

export default router;
