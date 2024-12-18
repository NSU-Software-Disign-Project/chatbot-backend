import { WebSocketService } from "../interpreter/services/WebSocketService";

export const shutdownServer = async (server: any, prisma: any, socketServer: WebSocketService) => {
    await prisma.$disconnect();
    socketServer.stop();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};