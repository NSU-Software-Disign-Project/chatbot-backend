import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ChatInterpreter } from '../../control/interpreter/ChatInterpreter';
import { SocketIO } from '../io/SocketIO';
import { getProjectConfiguration } from '../../control/db/databaseController';
import { Model } from '../../entity/BotModel';
import { prisma } from '../../control/db/database';

interface UserConnection {
  userId: string;
  projectId: string;
  socketId: string;
  isAnonymous: boolean;
  displayName?: string;
}

interface EditOperation {
  type: string;
  data: any;
  [key: string]: any;
}

export class WebSocketService {
  private io: Server;
  private projectNamespace: any;
  private userConnections: Map<string, UserConnection> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
      },
    });

    // Создание пространства имен для редактирования проектов
    this.projectNamespace = this.io.of('/project');
    this.setupProjectNamespace();

    // Создание пространства имен для совместного редактирования (стиль Google Docs)
    this.setupCollaborativeNamespace();
  }

  private setupProjectNamespace(): void {
    this.projectNamespace.on('connection', (socket: Socket) => {
      console.log(`Project namespace: Новое соединение ${socket.id}`);

      // Извлечение projectId и userId из параметров запроса
      const projectId = socket.handshake.query.projectId as string;
      const userId = socket.handshake.query.userId as string;

      if (!projectId || !userId) {
        console.error(`Missing projectId or userId for socket ${socket.id}`);
        socket.emit('error', { message: 'Missing projectId or userId' });
        socket.disconnect();
        return;
      }

      if (projectId.trim() === '' || userId.trim() === '') {
        console.error(`Empty projectId or userId for socket ${socket.id}`);
        socket.emit('error', {
          message: 'ProjectId and userId cannot be empty',
        });
        socket.disconnect();
        return;
      }

      console.log(`User ${userId} connecting to project ${projectId}`);

      // Присоединение к комнате проекта
      socket.join(projectId);

      // Сохранение информации о соединении пользователя
      this.userConnections.set(socket.id, {
        userId,
        projectId,
        socketId: socket.id,
        isAnonymous: false,
      });

      // Уведомление других пользователей в комнате о новом пользователе
      socket.to(projectId).emit('userJoined', {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      // Обработка операций редактирования
      socket.on('editOperation', (operation: EditOperation) => {
        try {
          console.log(
            `Операция редактирования от ${userId} в проекте ${projectId}:`,
            operation,
          );

          // Проверка операции
          if (!operation.type || !operation.data) {
            socket.emit('error', { message: 'Invalid edit operation format' });
            return;
          }

          // Трансляция всем другим пользователям в той же комнате проекта
          socket.to(projectId).emit('editOperation', {
            ...operation,
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(
            `Ошибка обработки операции редактирования от ${userId}:`,
            error,
          );
          socket.emit('error', { message: 'Error processing edit operation' });
        }
      });

      // Обработка выхода пользователя из проекта
      socket.on('leaveProject', () => {
        try {
          console.log(`User ${userId} leaving project ${projectId}`);
          socket.leave(projectId);
          this.userConnections.delete(socket.id);

          // Уведомление других пользователей
          socket.to(projectId).emit('userLeft', {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error handling user leave for ${userId}:`, error);
        }
      });

      // Обработка отключения
      socket.on('disconnect', () => {
        try {
          console.log(`User ${userId} disconnected from project ${projectId}`);
          this.userConnections.delete(socket.id);

          // Уведомление других пользователей
          socket.to(projectId).emit('userDisconnected', {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error handling disconnect for ${userId}:`, error);
        }
      });

      // Обработка ошибок
      socket.on('error', (err: Error) => {
        console.error(`Error for user ${userId} in project ${projectId}:`, err);
      });
    });
  }

  private setupCollaborativeNamespace(): void {
    const collaborativeNamespace = this.io.of('/collaborative');

    collaborativeNamespace.on('connection', (socket: Socket) => {
      console.log(`Collaborative namespace: New connection ${socket.id}`);

      // Извлечение shareToken из параметров запроса
      const shareToken = socket.handshake.query.shareToken as string;
      const displayName =
        (socket.handshake.query.displayName as string) ||
        `Anonymous ${Math.floor(Math.random() * 1000)}`;

      if (!shareToken) {
        console.error(`Missing shareToken for socket ${socket.id}`);
        socket.emit('error', { message: 'Missing shareToken' });
        socket.disconnect();
        return;
      }

      // Поиск проекта по токену доступа
      this.findProjectByShareToken(shareToken)
        .then((project) => {
          if (!project) {
            console.error(`Project not found for shareToken: ${shareToken}`);
            socket.emit('error', { message: 'Project not found' });
            socket.disconnect();
            return;
          }

          const roomId = `collaborative-${shareToken}`;
          const anonymousUserId = `anon-${socket.id}`;

          // Присоединение к комнате совместного редактирования
          socket.join(roomId);

          // Сохранение информации о соединении пользователя
          this.userConnections.set(socket.id, {
            userId: anonymousUserId,
            projectId: (project as any).projectId || project.id,
            socketId: socket.id,
            isAnonymous: true,
            displayName,
          });

          // Уведомление других пользователей в комнате о новом пользователе
          socket.to(roomId).emit('userJoined', {
            userId: anonymousUserId,
            socketId: socket.id,
            displayName,
            timestamp: new Date().toISOString(),
            isAnonymous: true,
          });

          // Отправка текущих данных проекта новому пользователю
          socket.emit('projectData', {
            nodeDataArray: (project as any).nodeDataArray || [],
            linkDataArray: (project as any).linkDataArray || [],
            projectName: project.name,
          });

          // Обработка операций редактирования
          socket.on('editOperation', (operation: EditOperation) => {
            try {
              console.log(
                `Collaborative edit operation from ${displayName} in project ${project.name}:`,
                operation,
              );

              // Проверка операции
              if (!operation.type || !operation.data) {
                socket.emit('error', {
                  message: 'Invalid edit operation format',
                });
                return;
              }

              // Трансляция всем другим пользователям в той же комнате
              socket.to(roomId).emit('editOperation', {
                ...operation,
                userId: anonymousUserId,
                socketId: socket.id,
                displayName,
                timestamp: new Date().toISOString(),
                isAnonymous: true,
              });

              // Обновление данных проекта в базе данных
              this.updateProjectData(project.id, operation);
            } catch (error) {
              console.error(
                `Error processing collaborative edit operation from ${displayName}:`,
                error,
              );
              socket.emit('error', {
                message: 'Error processing edit operation',
              });
            }
          });

          // Обработка выхода пользователя
          socket.on('leaveProject', () => {
            try {
              console.log(
                `Anonymous user ${displayName} leaving project ${project.name}`,
              );
              socket.leave(roomId);
              this.userConnections.delete(socket.id);

              // Уведомление других пользователей
              socket.to(roomId).emit('userLeft', {
                userId: anonymousUserId,
                socketId: socket.id,
                displayName,
                timestamp: new Date().toISOString(),
                isAnonymous: true,
              });
            } catch (error) {
              console.error(
                `Error handling anonymous user leave for ${displayName}:`,
                error,
              );
            }
          });

          // Обработка отключения
          socket.on('disconnect', () => {
            try {
              console.log(
                `Анонимный пользователь ${displayName} отключился от проекта ${project.name}`,
              );
              this.userConnections.delete(socket.id);

              // Уведомление других пользователей
              socket.to(roomId).emit('userDisconnected', {
                userId: anonymousUserId,
                socketId: socket.id,
                displayName,
                timestamp: new Date().toISOString(),
                isAnonymous: true,
              });
            } catch (error) {
              console.error(
                `Ошибка обработки отключения анонимного пользователя ${displayName}:`,
                error,
              );
            }
          });

          // Обработка ошибок
          socket.on('error', (err: Error) => {
            console.error(
              `Ошибка для анонимного пользователя ${displayName} в проекте ${project.name}:`,
              err,
            );
          });
        })
        .catch((error) => {
          console.error(
            `Ошибка поиска проекта для shareToken ${shareToken}:`,
            error,
          );
          socket.emit('error', { message: 'Error accessing project' });
          socket.disconnect();
        });
    });
  }

  private async findProjectByShareToken(shareToken: string) {
    try {
      // Сначала попробуем найти по полю shareToken (если оно существует)
      const project = await prisma.project.findFirst({
        where: { shareToken } as any,
      });

      if (project) {
        return project;
      }

      // Резервный вариант: попробуем найти по projectId (рассматривая projectId как shareToken)
      const projectById = await prisma.project.findFirst({
        where: { projectId: shareToken } as any,
      });

      return projectById;
    } catch (error) {
      console.error('Error finding project by share token:', error);
      return null;
    }
  }

  private async updateProjectData(projectId: string, operation: EditOperation) {
    try {
      // Получение текущих данных проекта
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        console.error('Project not found for update:', projectId);
        return;
      }

      // Обновление данных проекта в зависимости от типа операции
      let nodeDataArray: any[] = (project as any).nodeDataArray || [];
      let linkDataArray: any[] = (project as any).linkDataArray || [];

      switch (operation.type) {
        case 'nodeAdd':
          nodeDataArray.push(operation.data);
          break;
        case 'nodeDelete':
          nodeDataArray = nodeDataArray.filter(
            (node: any) => node.key !== operation.data.nodeId,
          );
          break;
        case 'nodeUpdate':
          const nodeIndex = nodeDataArray.findIndex(
            (node: any) => node.key === operation.data.nodeId,
          );
          if (nodeIndex >= 0) {
            nodeDataArray[nodeIndex] = {
              ...nodeDataArray[nodeIndex],
              ...operation.data,
            };
          }
          break;
        case 'linkAdd':
          linkDataArray.push(operation.data);
          break;
        case 'linkDelete':
          linkDataArray = linkDataArray.filter(
            (link: any) => link.key !== operation.data.linkId,
          );
          break;
        // Добавить больше типов операций по мере необходимости
      }

      // Сохранение обновленных данных
      await prisma.project.update({
        where: { id: projectId },
        data: {
          nodeDataArray: nodeDataArray as any,
          linkDataArray: linkDataArray as any,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating project data:', error);
    }
  }

  start(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Новое соединение:', socket.id);

      const chat = new SocketIO(socket);

      socket.on('start', async (projectName: string) => {
        try {
          const model: Model = await getProjectConfiguration(projectName);
          const interpreter = new ChatInterpreter(model, chat);
          interpreter.start();
        } catch (error) {
          console.error('Ошибка при запуске интерпретатора:', error);
          chat.sendError('Ошибка при запуске интерпретатора.');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Клиент ${socket.id} отключился`);
      });

      socket.on('error', (err: Error) => {
        console.error('Ошибка на сервере:', err);
      });
    });
  }

  stop(): void {
    console.log('Остановка WebSocket сервера...');

    this.io.sockets.sockets.forEach((socket: Socket) => {
      console.log(`Отключение клиента ${socket.id}`);
      socket.disconnect(true);
    });

    this.io.close(() => {
      console.log('WebSocket сервер успешно остановлен');
    });
  }

  // Получение активных пользователей в проекте
  getActiveUsersInProject(projectId: string): UserConnection[] {
    return Array.from(this.userConnections.values()).filter(
      (connection) => connection.projectId === projectId,
    );
  }

  // Получение всех активных соединений
  getAllConnections(): UserConnection[] {
    return Array.from(this.userConnections.values());
  }
}
