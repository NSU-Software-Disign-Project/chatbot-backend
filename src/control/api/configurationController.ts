import { Request, Response } from 'express';
import {
  upsertProject,
  getAllProjects,
  getProjectByName,
  deleteProjectByName,
  getProjectConfiguration,
  getProjectById,
  getProjectsForUser as getProjectsForUserDb
} from '../db/databaseController';
import { prisma } from '../db/database';
import { jsonToNodeData, jsonToLinkData } from '../db/jsonToModel';

// Сохранение проекта
export async function saveProjectConfiguration(req: Request, res: Response) {
  try {
    const projectName = req.params.name;
    const projectData = req.body;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    projectData.name = projectName;
    const updatedProject = await upsertProject(projectData);

    res.status(200).json({
      message: 'Project configuration saved successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error saving project configuration:', error);
    res.status(500).json({ message: 'Failed to save project', error });
  }
}

// Получение всех проектов
export async function getAllProjectConfigurations(req: Request, res: Response) {
  try {
    const projects = await getAllProjects();

    res.status(200).json({
      message: 'Projects retrieved successfully',
      data: projects,
    });
  } catch (error) {
    console.error('Error retrieving projects:', error);
    res.status(500).json({ message: 'Failed to retrieve projects', error });
  }
}

// Получение конфигурации проекта по имени
export async function getProjectConfigurationByName(req: Request, res: Response) {
  try {
    const projectName = req.params.name;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    const project = await getProjectConfiguration(projectName);

    res.status(200).json({
      message: 'Project configuration retrieved successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error retrieving project configuration:', error);
    res.status(500).json({ message: 'Failed to retrieve project configuration', error });
  }
}

// Удаление проекта
export async function deleteProjectConfiguration(req: Request, res: Response) {
  try {
    const projectName = req.params.name;

    if (!projectName) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    await deleteProjectByName(projectName);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error });
  }
}

// Новый: создание проекта
export async function createProject(req: Request, res: Response) {
  try {
    const { name, nodeDataArray, linkDataArray } = req.body;
    const userId = (req as any).user?.userId;
    if (!name || !userId) {
      res.status(400).json({ error: 'Project name and userId required' });
      return;
    }
    // Если пришли данные, прогоняем через транслятор, иначе стартовый блок
    const nodeDataArrayDb = (nodeDataArray && nodeDataArray.length > 0)
      ? nodeDataArray.map(jsonToNodeData)
      : [{ id: 0, type: "startBlock" }];
    const linkDataArrayDb = (linkDataArray || []).map(jsonToLinkData);
    // Используем upsertProject для единообразия
    const project = await upsertProject({
      name,
      nodeDataArray: nodeDataArrayDb,
      linkDataArray: linkDataArrayDb,
      ownerId: userId,
      sharedWith: [],
    });
    res.status(201).json({ project });
  } catch (error) {
    const err: any = error;
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Проект с таким именем уже существует' });
    } else {
      res.status(500).json({ error: 'Ошибка создания проекта', details: err });
    }
  }
}

// Новый: получение конфига по id
export async function getProjectConfigById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    if (!id) {
      res.status(400).json({ error: 'Project id required' });
      return;
    }
    const project = await getProjectById(id);
    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }
    // Определяем роль пользователя
    let role = 'viewer';
    type SharedWithEntry = { userId: string, email: string, permission: string };
    const sharedWithArr: SharedWithEntry[] = Array.isArray(project.sharedWith) ? (project.sharedWith as SharedWithEntry[]) : [];
    if (project.ownerId === userId) {
      role = 'owner';
    } else if (sharedWithArr.length > 0) {
      const found = sharedWithArr.find((sw) => sw.userId === userId);
      if (found) role = found.permission;
    }
    // sharedWith только для owner и manager
    let sharedWith: SharedWithEntry[] = [];
    if (role === 'owner' || role === 'manager') {
      sharedWith = sharedWithArr;
    }
    res.status(200).json({
      nodeDataArray: (project.nodeDataArray || []).map(jsonToNodeData),
      linkDataArray: (project.linkDataArray || []).map(jsonToLinkData),
      name: project.name,
      id: project.id,
      ownerId: project.ownerId,
      sharedWith,
      role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения конфига проекта', details: error });
  }
}

// Получить все проекты пользователя
export async function getProjectsForUser(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  try {
    const projects = await getProjectsForUserDb(userId);
    // Оставляем только метаданные, не отправляем sharedWith
    const meta = projects.map(p => {
      // Корректно определяем роль
      let role = 'viewer';
      type SharedWithEntry = { userId: string, email: string, permission: string };
      const sharedWithArr: SharedWithEntry[] = Array.isArray(p.sharedWith) ? (p.sharedWith as SharedWithEntry[]) : [];
      if (p.ownerId === userId) {
        role = 'owner';
      } else if (sharedWithArr.length > 0) {
        const found = sharedWithArr.find((sw) => sw.userId === userId);
        if (found) role = found.permission;
      }
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        role,
        ownerId: p.ownerId,
      };
    });
    res.json({ projects: meta });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения проектов', details: e });
  }
}

// Вспомогательная функция для поиска проекта и проверки доступа
async function findProjectWithAccess(id: string, userId: string, access: 'owner' | 'editor' | 'viewer' = 'owner') {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return { error: { status: 404, message: 'Проект не найден' } };
  if (project.ownerId === userId) return { project, role: 'owner' };
  const shared = Array.isArray(project.sharedWith) ? project.sharedWith as { userId: string, permission: string }[] : [];
  const found = shared.find((sw) => sw.userId === userId);
  if (found) {
    if (access === 'viewer' && (found.permission === 'viewer' || found.permission === 'editor' || found.permission === 'manager')) return { project, role: found.permission };
    if (access === 'editor' && (found.permission === 'editor' || found.permission === 'manager')) return { project, role: found.permission };
  }
  return { error: { status: 403, message: 'Нет доступа' } };
}

// Обновить (сохранить) конфиг проекта по id
export async function updateProjectConfig(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { nodeDataArray, linkDataArray, name } = req.body;
  try {
    const { project, error, role } = await findProjectWithAccess(id, userId, 'editor');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (role !== 'owner' && role !== 'editor' && role !== 'manager') {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }
    const nodeDataArrayDb = (nodeDataArray || []).map(jsonToNodeData);
    const linkDataArrayDb = (linkDataArray || []).map(jsonToLinkData);
    // Используем upsertProject для обновления
    const updated = await upsertProject({
      name: name || project.name,
      nodeDataArray: nodeDataArrayDb,
      linkDataArray: linkDataArrayDb,
      ownerId: project.ownerId,
      sharedWith: project.sharedWith,
    });
    res.json({ project: updated });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления проекта', details: e });
  }
}

// Удалить проект по id
export async function deleteProject(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  try {
    const { project, error } = await findProjectWithAccess(id, userId, 'owner');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Проект удалён' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления проекта', details: e });
  }
}

// PATCH для переименования проекта
export async function renameProject(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Новое имя проекта не указано' });
    return;
  }
  try {
    const { project, error } = await findProjectWithAccess(id, userId, 'owner');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const updated = await prisma.project.update({
      where: { id },
      data: { name: name.trim(), updatedAt: new Date() },
    });
    res.json({ project: updated });
  } catch (e: any) {
    if (e.code === 'P2002') {
      res.status(409).json({
        error: 'Проект с таким именем уже существует',
        details: e
      });
    } else {
      res.status(500).json({ error: 'Ошибка переименования проекта', details: e });
    }
  }
}

// --- Шаринг ---
// Добавить пользователя к sharedWith
export async function addProjectShare(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { userId: targetUserId, permission } = req.body;
  if (!targetUserId || !permission) {
    res.status(400).json({ error: 'userId и permission обязательны' });
    return;
  }
  try {
    // Проверяем права: владелец или менеджер
    const { project, error, role } = await findProjectWithAccess(id, userId, 'editor');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    // Только владелец и менеджер могут делиться
    if (role !== 'owner' && role !== 'manager') {
      res.status(403).json({ error: 'Только владелец или менеджер может делиться проектом' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    const sharedWith = Array.isArray(project.sharedWith) ? [...project.sharedWith] : [];
    if (sharedWith.find((sw: any) => sw.userId === targetUserId)) {
      res.status(409).json({ error: 'Пользователь уже добавлен' });
      return;
    }
    sharedWith.push({ userId: targetUserId, email: user.email, permission });
    await prisma.project.update({ where: { id }, data: { sharedWith: JSON.parse(JSON.stringify(sharedWith)) } });
    res.json({ message: 'Пользователь добавлен в sharedWith', sharedWith });
    return;
  } catch (e) {
    res.status(500).json({ error: 'Ошибка добавления пользователя', details: e });
  }
}

// Изменить права пользователя
export async function updateProjectShare(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { userId: targetUserId, permission } = req.body;
  if (!targetUserId || !permission) {
    res.status(400).json({ error: 'userId и permission обязательны' });
    return;
  }
  try {
    // Проверяем права: владелец или менеджер
    const { project, error, role } = await findProjectWithAccess(id, userId, 'editor');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    let sharedWith = Array.isArray(project.sharedWith) ? [...project.sharedWith] : [];
    type SharedWithEntry = { userId: string, email: string, permission: string };
    const sharedWithArr: SharedWithEntry[] = sharedWith as SharedWithEntry[];
    const idx = sharedWithArr.findIndex((sw) => sw && sw.userId === targetUserId);
    if (idx === -1) {
      res.status(404).json({ error: 'Пользователь не найден в sharedWith' });
      return;
    }
    const target: SharedWithEntry | undefined = sharedWithArr[idx];
    // Менеджер не может менять права других менеджеров и себя
    if (role === 'manager') {
      if (target?.permission === 'manager' || targetUserId === userId) {
        res.status(403).json({ error: 'Менеджер не может менять права других менеджеров или свои' });
        return;
      }
    } else if (role !== 'owner') {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }
    if (target && typeof target === 'object') {
      target.permission = permission;
      sharedWithArr[idx] = target;
    } else {
      res.status(500).json({ error: 'Некорректная структура sharedWith' });
      return;
    }
    await prisma.project.update({ where: { id }, data: { sharedWith: JSON.parse(JSON.stringify(sharedWithArr)) } });
    res.json({ message: 'Права пользователя обновлены', sharedWith: sharedWithArr });
    return;
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления прав', details: e });
  }
}

// Удалить пользователя из sharedWith
export async function removeProjectShare(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { id, userId: targetUserId } = req.params;
  try {
    // Проверяем права: владелец или менеджер
    const { project, error, role } = await findProjectWithAccess(id, userId, 'editor');
    if (error) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    let sharedWith = Array.isArray(project.sharedWith) ? [...project.sharedWith] : [];
    type SharedWithEntry = { userId: string, email: string, permission: string };
    const sharedWithArr: SharedWithEntry[] = sharedWith as SharedWithEntry[];
    const target: SharedWithEntry | undefined = sharedWithArr.find((sw) => sw && sw.userId === targetUserId);
    if (!target) {
      res.status(404).json({ error: 'Пользователь не найден в sharedWith' });
      return;
    }
    // Менеджер не может удалять других менеджеров и себя
    if (role === 'manager') {
      if (target?.permission === 'manager' || targetUserId === userId) {
        res.status(403).json({ error: 'Менеджер не может удалять других менеджеров или себя' });
        return;
      }
    } else if (role !== 'owner') {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }
    const filtered = sharedWithArr.filter((sw) => sw && sw.userId !== targetUserId);
    await prisma.project.update({ where: { id }, data: { sharedWith: JSON.parse(JSON.stringify(filtered)) } });
    res.json({ message: 'Пользователь удалён из sharedWith', sharedWith: filtered });
    return;
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления пользователя', details: e });
  }
}

// Получить только ownerId и sharedWith по id проекта
export async function getProjectSharingInfoById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    if (!id) {
      res.status(400).json({ error: 'Project id required' });
      return;
    }
    const project = await getProjectById(id);
    if (!project) {
      res.status(404).json({ error: 'Проект не найден' });
      return;
    }
    let ownerEmail = null;
    if (project.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: project.ownerId } });
      ownerEmail = owner?.email || null;
    }
    // Определяем роль пользователя
    let role = 'viewer';
    type SharedWithEntry = { userId: string, email: string, permission: string };
    const sharedWithArr: SharedWithEntry[] = Array.isArray(project.sharedWith) ? (project.sharedWith as SharedWithEntry[]) : [];
    if (project.ownerId === userId) {
      role = 'owner';
    } else if (sharedWithArr.length > 0) {
      const found = sharedWithArr.find((sw) => sw.userId === userId);
      if (found) role = found.permission;
    }
    // sharedWith только для owner и manager
    let sharedWith: SharedWithEntry[] = [];
    if (role === 'owner' || role === 'manager') {
      sharedWith = sharedWithArr;
    }
    res.status(200).json({
      ownerId: project.ownerId,
      ownerEmail,
      sharedWith,
      role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения доступа', details: error });
  }
}
