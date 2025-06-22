import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { ChatInterpreter } from "../../control/interpreter/ChatInterpreter";
import { SocketIO } from "../io/SocketIO";
import { getProjectConfiguration, getProjectById } from "../../control/db/databaseController";
import { Model } from "../../entity/BotModel";

interface BotSession {
  interpreter: ChatInterpreter;
  isActive: boolean;
  currentCommand?: string;
}

export class WebSocketService {
    private io: Server;
    private botSessions: Map<string, BotSession> = new Map();

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "DELETE", "PUT", "PATCH"]
            }
        });
    }

    start(): void {
        this.io.on("connection", (socket) => {
            console.log("Новое соединение:", socket.id);

            const chat = new SocketIO(socket);

            socket.on("start", async (projectId: string) => {
                try {
                    const project = await getProjectById(projectId);
                    if (!project) throw new Error('Project not found');
                    const model: Model = {
                        nodeDataArray: project.nodeDataArray.map((n: any) => n),
                        linkDataArray: project.linkDataArray.map((l: any) => l),
                    };
                    const interpreter = new ChatInterpreter(model, chat);
                    
                    const session: BotSession = {
                        interpreter,
                        isActive: true
                    };
                    
                    this.botSessions.set(socket.id, session);
                    interpreter.start();
                } catch (error) {
                    console.error("Ошибка при запуске интерпретатора:", error);
                    chat.sendError("Ошибка при запуске интерпретатора.");
                }
            });

            socket.on("message", async (message: string) => {
                const session = this.botSessions.get(socket.id);
                if (session && session.isActive) {
                    try {
                        // Просто передаём сообщение в интерпретатор
                        await this.processUserMessage(socket.id, message, chat);
                    } catch (error) {
                        console.error("Ошибка при обработке сообщения:", error);
                        chat.sendError("Ошибка при обработке сообщения.");
                    }
                }
            });

            socket.on("disconnect", () => {
                console.log(`Клиент ${socket.id} отключился`);
                this.botSessions.delete(socket.id);
            });

            socket.on("error", (err) => {
                console.error("Ошибка на сервере:", err);
            });
        });
    }

    private async processUserMessage(socketId: string, message: string, chat: SocketIO): Promise<void> {
        const session = this.botSessions.get(socketId);
        if (!session || !session.isActive) return;

        // Передаем сообщение в интерпретатор для обработки
        await session.interpreter.handleUserMessage(message);
    }

    stop(): void {
        console.log('Остановка WebSocket сервера...');

        this.io.close(() => {
            console.log('WebSocket сервер успешно остановлен.');
        });

        this.botSessions.clear();
    }
}
