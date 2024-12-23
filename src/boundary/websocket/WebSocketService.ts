import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { ChatInterpreter } from "../../control/interpreter/ChatInterpreter";
import { SocketIO } from "../io/SocketIO";
import { getProjectConfiguration } from "../../control/db/databaseController";
import { Model } from "../../entity/BotModel";

export class WebSocketService {
    private io: Server;

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
    }

    start(): void {
        this.io.on("connection", (socket) => {
            console.log("Новое соединение:", socket.id);

            const chat = new SocketIO(socket);

            socket.on("start", async (projectName: string) => {
                try {
                    const model: Model = await getProjectConfiguration(projectName);
                    const interpreter = new ChatInterpreter(model, chat);
                    interpreter.start();
                } catch (error) {
                    console.error("Ошибка при запуске интерпретатора:", error);
                    chat.sendError("Ошибка при запуске интерпретатора.");
                }
            });

            socket.on("disconnect", () => {
                console.log(`Клиент ${socket.id} отключился`);
            });

            socket.on("error", (err) => {
                console.error("Ошибка на сервере:", err);
            });
        });
    }

    stop(): void {
        console.log("Остановка WebSocket сервера...");

        this.io.sockets.sockets.forEach((socket) => {
            console.log(`Отключение клиента ${socket.id}`);
            socket.disconnect(true);
        });

        this.io.close(() => {
            console.log("WebSocket сервер успешно остановлен");
        });
    }
}
