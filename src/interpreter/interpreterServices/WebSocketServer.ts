import { createServer } from "http";
import { Server } from "socket.io";
import { WebSocketService } from "./WebSocketService";

export function startWebSocketServer(port: number): void {
    const httpServer = createServer();

    const io = new Server(httpServer);

    const webSocketService = new WebSocketService(io);
    webSocketService.start();

    httpServer.listen(port, () => {
        console.log(`WebSocketServer запущен на http://localhost:${port}`);
    });
}
