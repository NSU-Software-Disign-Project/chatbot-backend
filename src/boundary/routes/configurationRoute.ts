import { Router } from 'express';
import {
  saveProjectConfiguration,
  getAllProjectConfigurations,
  getProjectConfigurationByName,
  deleteProjectConfiguration,
} from '../../control/api/configurationController';

const router = Router();

router.post('/project/:name', saveProjectConfiguration);
router.get('/projects', getAllProjectConfigurations);
router.get('/project/:name', getProjectConfigurationByName);
router.delete('/project/:name', deleteProjectConfiguration);

export default router;
