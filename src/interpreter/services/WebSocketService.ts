import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { ChatInterpreter } from "../ChatInterpreter";
import { SocketIO } from "../io/SocketIO";

export class WebSocketService {
    private io: Server;

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer);
    }

    start(): void {
        this.io.on("connection", (socket) => {
            console.log("Новое соединение:", socket.id);

            const chat = new SocketIO(socket);
            const model = require('../jsonModel.json');
            const interpreter = new ChatInterpreter(model, chat);

            socket.on("start", () => {
                interpreter.start();
            });

            socket.on("disconnect", () => {
                console.log(`Клиент ${socket.id} отключился`);
            });

            socket.on("error", (err) => {
                console.error("Ошибка на сервере:", err);
            });
        });
    }
}
