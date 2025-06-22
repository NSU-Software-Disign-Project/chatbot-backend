import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ChatInterpreter } from '../../control/interpreter/ChatInterpreter';
import { SocketIO } from '../io/SocketIO';
import { getProjectByShareToken } from '../../control/db/databaseController';
import { Model } from '../../entity/BotModel';
import { prisma } from '../../control/db/database';
import { jsonToNodeData, jsonToLinkData } from '../../control/db/jsonToModel';

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
  private operationQueue: Map<string, EditOperation[]> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
      },
    });

    // Create namespace for project editing
    this.projectNamespace = this.io.of('/project');
    this.setupProjectNamespace();

    // Create namespace for collaborative editing (Google Docs style)
    this.setupCollaborativeNamespace();
  }

  private setupProjectNamespace(): void {
    this.projectNamespace.on('connection', (socket: Socket) => {
      console.log(`Project namespace: New connection ${socket.id}`);

      // Extract projectId and userId from query parameters
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

      // Join project room
      socket.join(projectId);

      // Save user connection information
      this.userConnections.set(socket.id, {
        userId,
        projectId,
        socketId: socket.id,
        isAnonymous: false,
      });

      // Notify other users in the room about new user
      socket.to(projectId).emit('userJoined', {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      // Handle edit operations
      socket.on('editOperation', (operation: EditOperation) => {
        try {
          console.log(
            `Edit operation from ${userId} in project ${projectId}:`,
            operation,
          );

          // Validate operation
          if (!operation.type || !operation.data) {
            socket.emit('error', { message: 'Invalid edit operation format' });
            return;
          }

          // Broadcast to all other users in the same project room
          socket.to(projectId).emit('editOperation', {
            ...operation,
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(
            `Error processing edit operation from ${userId}:`,
            error,
          );
          socket.emit('error', { message: 'Error processing edit operation' });
        }
      });

      // Handle user leaving project
      socket.on('leaveProject', () => {
        try {
          console.log(`User ${userId} leaving project ${projectId}`);
          socket.leave(projectId);
          this.userConnections.delete(socket.id);

          // Notify other users
          socket.to(projectId).emit('userLeft', {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error handling user leave for ${userId}:`, error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        try {
          console.log(`User ${userId} disconnected from project ${projectId}`);
          this.userConnections.delete(socket.id);

          // Notify other users
          socket.to(projectId).emit('userDisconnected', {
            userId,
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error handling disconnect for ${userId}:`, error);
        }
      });

      // Handle errors
      socket.on('error', (err: Error) => {
        console.error(`Error for user ${userId} in project ${projectId}:`, err);
      });
    });
  }

  private setupCollaborativeNamespace(): void {
    const collaborativeNamespace = this.io.of('/collaborative');

    collaborativeNamespace.on('connection', (socket: Socket) => {
      console.log(`Collaborative namespace: New connection ${socket.id}`);

      // Extract shareToken from query parameters
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

      // Find project by share token
      this.findProjectByShareToken(shareToken)
        .then(async (project) => {
          if (!project) {
            console.error(`Project not found for shareToken: ${shareToken}`);
            socket.emit('error', { message: 'Project not found' });
            socket.disconnect();
            return;
          }

          const roomId = `collaborative-${shareToken}`;
          const anonymousUserId = `anon-${socket.id}`;

          // Join collaborative editing room
          socket.join(roomId);

          // Save user connection information
          this.userConnections.set(socket.id, {
            userId: anonymousUserId,
            projectId: (project as any).projectId || project.id,
            socketId: socket.id,
            isAnonymous: true,
            displayName,
          });

          // Notify other users in the room about new user
          socket.to(roomId).emit('userJoined', {
            userId: anonymousUserId,
            socketId: socket.id,
            displayName,
            timestamp: new Date().toISOString(),
            isAnonymous: true,
          });

          // Send current project data to new user
          const freshProjectData = await this.getFreshProjectData(project.id);
          socket.emit('projectData', {
            nodeDataArray: freshProjectData.nodeDataArray || [],
            linkDataArray: freshProjectData.linkDataArray || [],
            projectName: project.name,
          });

          // Handle edit operations
          socket.on('editOperation', async (operation: EditOperation) => {
            try {
              console.log(
                `Collaborative edit operation from ${displayName} in project ${project.name}:`,
                operation,
              );

              // Validate operation
              if (!operation.type || !operation.data) {
                socket.emit('error', {
                  message: 'Invalid edit operation format',
                });
                return;
              }

              // Add operation to queue for processing
              this.addToOperationQueue(project.id, operation);

              // Broadcast to all other users in the same room
              socket.to(roomId).emit('editOperation', {
                ...operation,
                userId: anonymousUserId,
                socketId: socket.id,
                displayName,
                timestamp: new Date().toISOString(),
                isAnonymous: true,
              });

              // Process operation queue asynchronously
              this.processOperationQueue(project.id);
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

          // Handle user leaving
          socket.on('leaveProject', () => {
            try {
              console.log(
                `Anonymous user ${displayName} leaving project ${project.name}`,
              );
              socket.leave(roomId);
              this.userConnections.delete(socket.id);

              // Notify other users
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

          // Handle disconnection
          socket.on('disconnect', () => {
            try {
              console.log(
                `Anonymous user ${displayName} disconnected from project ${project.name}`,
              );
              this.userConnections.delete(socket.id);

              // Notify other users
              socket.to(roomId).emit('userDisconnected', {
                userId: anonymousUserId,
                socketId: socket.id,
                displayName,
                timestamp: new Date().toISOString(),
                isAnonymous: true,
              });
            } catch (error) {
              console.error(
                `Error handling anonymous user disconnect for ${displayName}:`,
                error,
              );
            }
          });

          // Handle errors
          socket.on('error', (err: Error) => {
            console.error(
              `Error for anonymous user ${displayName} in project ${project.name}:`,
              err,
            );
          });
        })
        .catch((error) => {
          console.error(
            `Error finding project for shareToken ${shareToken}:`,
            error,
          );
          socket.emit('error', { message: 'Error accessing project' });
          socket.disconnect();
        });
    });
  }

  private async findProjectByShareToken(shareToken: string) {
    try {
      // First try to find by shareToken field
      const project = await prisma.project.findFirst({
        where: { shareToken } as any,
      });

      if (project) {
        return project;
      }

      // Fallback: try to find by projectId (treating projectId as shareToken)
      const projectById = await prisma.project.findFirst({
        where: { projectId: shareToken } as any,
      });

      return projectById;
    } catch (error) {
      console.error('Error finding project by share token:', error);
      return null;
    }
  }

  private addToOperationQueue(projectId: string, operation: EditOperation) {
    if (!this.operationQueue.has(projectId)) {
      this.operationQueue.set(projectId, []);
    }
    this.operationQueue.get(projectId)!.push(operation);
  }

  private async processOperationQueue(projectId: string) {
    if (this.processingQueue.get(projectId)) {
      return; // Already processing
    }

    this.processingQueue.set(projectId, true);

    try {
      const queue = this.operationQueue.get(projectId) || [];
      if (queue.length === 0) {
        return;
      }

      // Process all operations in batch
      const operations = [...queue];
      this.operationQueue.set(projectId, []);

      console.log(
        `Processing ${operations.length} operations for project ${projectId}`,
      );

      // Get current project data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        console.error('Project not found for operation processing:', projectId);
        return;
      }

      let nodeDataArray: any[] = (project as any).nodeDataArray || [];
      let linkDataArray: any[] = (project as any).linkDataArray || [];

      // Process each operation
      for (const operation of operations) {
        await this.processSingleOperation(
          operation,
          nodeDataArray,
          linkDataArray,
        );
      }

      // Save updated data to database
      await prisma.project.update({
        where: { id: projectId },
        data: {
          nodeDataArray: nodeDataArray as any,
          linkDataArray: linkDataArray as any,
          updatedAt: new Date(),
        } as any,
      });

      console.log(
        `Successfully processed ${operations.length} operations for project ${projectId}`,
      );
    } catch (error) {
      console.error('Error processing operation queue:', error);
    } finally {
      this.processingQueue.set(projectId, false);
    }
  }

  private async processSingleOperation(
    operation: EditOperation,
    nodeDataArray: any[],
    linkDataArray: any[],
  ) {
    console.log(`Processing operation: ${operation.type}`, operation.data);

    switch (operation.type) {
      case 'nodeAdd':
        await this.processNodeAdd(operation.data, nodeDataArray);
        break;
      case 'nodeDelete':
        await this.processNodeDelete(
          operation.data,
          nodeDataArray,
          linkDataArray,
        );
        break;
      case 'nodeUpdate':
        await this.processNodeUpdate(operation.data, nodeDataArray);
        break;
      case 'nodeMove':
        await this.processNodeMove(operation.data, nodeDataArray);
        break;
      case 'linkAdd':
        await this.processLinkAdd(operation.data, linkDataArray);
        break;
      case 'linkDelete':
        await this.processLinkDelete(operation.data, linkDataArray);
        break;
      case 'textChange':
        await this.processTextChange(operation.data, nodeDataArray);
        break;
      case 'portChange':
        await this.processPortChange(operation.data, nodeDataArray);
        break;
      default:
        console.warn(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processNodeAdd(data: any, nodeDataArray: any[]) {
    // Handle both 'key' and 'id' fields from frontend
    const nodeKey = data.key || data.id;
    const nodeId = nodeKey || Math.floor(Date.now() + Math.random() * 1000); // Ensure positive ID

    const nodeToAdd = {
      id: nodeId,
      type: data.category || data.type,
      text: data.message || data.text,
      variableName: data.variableName,
      url: data.url,
      conditions: data.conditions,
      options: data.options,
      loc: data.loc || { x: 100, y: 100 },
    };

    // Check if node already exists
    const existingIndex = nodeDataArray.findIndex(
      (node: any) => node.id === nodeToAdd.id,
    );
    if (existingIndex === -1) {
      nodeDataArray.push(nodeToAdd);
      console.log(`Added node with id: ${nodeToAdd.id}`);
    } else {
      console.log(
        `Node with id ${nodeToAdd.id} already exists, updating instead`,
      );
      nodeDataArray[existingIndex] = {
        ...nodeDataArray[existingIndex],
        ...nodeToAdd,
      };
    }
  }

  private async processNodeDelete(
    data: any,
    nodeDataArray: any[],
    linkDataArray: any[],
  ) {
    const nodeIdToDelete = data.nodeId || data.key || data;
    console.log(`Deleting node with id: ${nodeIdToDelete}`);

    // Remove node
    const beforeDeleteCount = nodeDataArray.length;
    nodeDataArray = nodeDataArray.filter(
      (node: any) => node.id !== nodeIdToDelete,
    );
    const afterDeleteCount = nodeDataArray.length;

    // Remove connected links
    const beforeDeleteLinkCount = linkDataArray.length;
    linkDataArray = linkDataArray.filter(
      (link: any) => link.from !== nodeIdToDelete && link.to !== nodeIdToDelete,
    );
    const afterDeleteLinkCount = linkDataArray.length;

    console.log(
      `Deleted ${beforeDeleteCount - afterDeleteCount} nodes and ${beforeDeleteLinkCount - afterDeleteLinkCount} links`,
    );
  }

  private async processNodeUpdate(data: any, nodeDataArray: any[]) {
    const { nodeId, ...updates } = data;
    const nodeIndex = nodeDataArray.findIndex(
      (node: any) => node.id === nodeId,
    );

    if (nodeIndex >= 0) {
      nodeDataArray[nodeIndex] = {
        ...nodeDataArray[nodeIndex],
        ...updates,
      };
      console.log(`Updated node with id: ${nodeId}`);
    } else {
      console.warn(`Node with id ${nodeId} not found for update`);
    }
  }

  private async processNodeMove(data: any, nodeDataArray: any[]) {
    const { nodeId, x, y } = data;
    const nodeIndex = nodeDataArray.findIndex(
      (node: any) => node.id === nodeId,
    );

    if (nodeIndex >= 0) {
      nodeDataArray[nodeIndex].loc = { x, y };
      console.log(`Moved node with id: ${nodeId} to (${x}, ${y})`);
    } else {
      console.warn(`Node with id ${nodeId} not found for move`);
    }
  }

  private async processLinkAdd(data: any, linkDataArray: any[]) {
    const linkToAdd = {
      key: data.key || Date.now() + Math.random(),
      from: data.from,
      to: data.to,
      fromPort: data.fromPort,
      toPort: data.toPort,
    };

    // Check if link already exists
    const existingIndex = linkDataArray.findIndex(
      (link: any) => link.key === linkToAdd.key,
    );
    if (existingIndex === -1) {
      linkDataArray.push(linkToAdd);
      console.log(`Added link with key: ${linkToAdd.key}`);
    } else {
      console.log(
        `Link with key ${linkToAdd.key} already exists, updating instead`,
      );
      linkDataArray[existingIndex] = {
        ...linkDataArray[existingIndex],
        ...linkToAdd,
      };
    }
  }

  private async processLinkDelete(data: any, linkDataArray: any[]) {
    const linkKeyToDelete = data.linkId || data.key || data;
    console.log(`Deleting link with key: ${linkKeyToDelete}`);

    const beforeDeleteCount = linkDataArray.length;
    linkDataArray = linkDataArray.filter(
      (link: any) => link.key !== linkKeyToDelete,
    );
    const afterDeleteCount = linkDataArray.length;

    console.log(`Deleted ${beforeDeleteCount - afterDeleteCount} links`);
  }

  private async processTextChange(data: any, nodeDataArray: any[]) {
    const { nodeId, text } = data;
    const nodeIndex = nodeDataArray.findIndex(
      (node: any) => node.id === nodeId,
    );

    if (nodeIndex >= 0) {
      nodeDataArray[nodeIndex].text = text;
      console.log(`Updated text for node with id: ${nodeId}`);
    } else {
      console.warn(`Node with id ${nodeId} not found for text change`);
    }
  }

  private async processPortChange(data: any, nodeDataArray: any[]) {
    const { nodeId, portId, value } = data;
    const nodeIndex = nodeDataArray.findIndex(
      (node: any) => node.id === nodeId,
    );

    if (nodeIndex >= 0) {
      const node = nodeDataArray[nodeIndex];
      if (node.type === 'conditionalBlock' && node.conditions) {
        const conditionIndex = node.conditions.findIndex(
          (c: any) => c.portId === portId,
        );
        if (conditionIndex !== -1) {
          node.conditions[conditionIndex] = {
            ...node.conditions[conditionIndex],
            ...value,
          };
        }
      } else if (node.type === 'optionsBlock' && node.options) {
        const optionIndex = node.options.findIndex(
          (o: any) => o.portId === portId,
        );
        if (optionIndex !== -1) {
          node.options[optionIndex] = {
            ...node.options[optionIndex],
            ...value,
          };
        }
      }
      console.log(`Updated port ${portId} for node with id: ${nodeId}`);
    } else {
      console.warn(`Node with id ${nodeId} not found for port change`);
    }
  }

  start(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New connection:', socket.id);

      const chat = new SocketIO(socket);

      socket.on('start', async (shareToken: string) => {
        try {
          // Try to get project by share token first
          const project = await getProjectByShareToken(shareToken);
          if (!project) {
            throw new Error(`Project not found for share token: ${shareToken}`);
          }

          // Convert the project data to the expected Model format
          const model: Model = {
            nodeDataArray: ((project.nodeDataArray as any[]) || []).map(
              jsonToNodeData,
            ),
            linkDataArray: ((project.linkDataArray as any[]) || []).map(
              jsonToLinkData,
            ),
          };

          const interpreter = new ChatInterpreter(model, chat);
          interpreter.start();
        } catch (error) {
          console.error('Error starting interpreter:', error);
          chat.sendError('Error starting interpreter.');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`);
      });

      socket.on('error', (err: Error) => {
        console.error('Server error:', err);
      });
    });
  }

  stop(): void {
    console.log('Stopping WebSocket server...');

    this.io.sockets.sockets.forEach((socket: Socket) => {
      console.log(`Disconnecting client ${socket.id}`);
      socket.disconnect(true);
    });

    this.io.close(() => {
      console.log('WebSocket server successfully stopped');
    });
  }

  // Get active users in project
  getActiveUsersInProject(projectId: string): UserConnection[] {
    return Array.from(this.userConnections.values()).filter(
      (connection) => connection.projectId === projectId,
    );
  }

  // Get all active connections
  getAllConnections(): UserConnection[] {
    return Array.from(this.userConnections.values());
  }

  private async getFreshProjectData(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        console.error('Project not found for fresh data:', projectId);
        return { nodeDataArray: [], linkDataArray: [] };
      }

      return {
        nodeDataArray: (project as any).nodeDataArray || [],
        linkDataArray: (project as any).linkDataArray || [],
      };
    } catch (error) {
      console.error('Error getting fresh project data:', error);
      return { nodeDataArray: [], linkDataArray: [] };
    }
  }
}
