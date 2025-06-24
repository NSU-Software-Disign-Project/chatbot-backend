import express from 'express';
import { authenticateJWT } from '../../services/jwt';
import {
  createProject,
  getProjectConfigById,
  updateProjectConfig,
  deleteProject,
  renameProject,
  getProjectsForUser,
  addProjectShare,
  updateProjectShare,
  removeProjectShare,
  getProjectSharingInfoById
} from '../../control/api/configurationController';

const router = express.Router();

// Получить все проекты пользователя
router.get('/', authenticateJWT, getProjectsForUser);

// Создать проект
router.post('/create', authenticateJWT, createProject);

// --- Шаринг ---
// Добавить пользователя к sharedWith
router.post('/:id/share', authenticateJWT, addProjectShare);
// Изменить права пользователя
router.patch('/:id/share', authenticateJWT, updateProjectShare);
// Удалить пользователя из sharedWith
router.delete('/:id/share/:userId', authenticateJWT, removeProjectShare);
// ---

// Получить конфиг проекта по id
router.get('/:id/config', authenticateJWT, getProjectConfigById);

// Обновить (сохранить) конфиг проекта по id
router.put('/:id/config', authenticateJWT, updateProjectConfig);

// Удалить проект по id
router.delete('/:id', authenticateJWT, deleteProject);

// PATCH для переименования проекта
router.patch('/:id', authenticateJWT, renameProject);

// Получить только ownerId и sharedWith
router.get('/:id/sharing', authenticateJWT, getProjectSharingInfoById);

export default router; 