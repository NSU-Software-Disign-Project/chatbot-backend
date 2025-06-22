import { Router } from 'express';
import {
  saveProjectConfiguration,
  getProjectConfigurationByName,
  deleteProjectConfiguration,
  shareProjectController,
  getAccessibleProjectsController,
  getProjectByShareableIdController,
  checkProjectAccessController,
  createCollaborativeProjectController,
  getCollaborativeProjectController,
  updateCollaborativeProjectController,
  deleteCollaborativeProjectController,
} from '../../control/api/configurationController';
import { authMiddleware } from '../../services/authMiddleware';

const router = Router();

// Existing project routes
router.post('/project/:name', authMiddleware, saveProjectConfiguration);
router.get('/project/:name', getProjectConfigurationByName);
router.delete('/project/:name', authMiddleware, deleteProjectConfiguration);

// New sharing routes
router.get(
  '/accessible-projects',
  authMiddleware,
  getAccessibleProjectsController,
);
router.get('/project/:projectId/shareable', getProjectByShareableIdController);
router.post(
  '/project/:projectId/share',
  authMiddleware,
  shareProjectController,
);
router.get(
  '/project/:projectId/access',
  authMiddleware,
  checkProjectAccessController,
);

router.post(
  '/collaborative/project',
  authMiddleware,
  createCollaborativeProjectController,
);
router.get(
  '/collaborative/project/:shareToken',
  getCollaborativeProjectController,
);
router.put(
  '/collaborative/project/:shareToken',
  updateCollaborativeProjectController,
);
router.delete(
  '/collaborative/project/:projectId',
  authMiddleware,
  deleteCollaborativeProjectController,
);

export default router;
