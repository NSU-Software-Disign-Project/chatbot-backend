import { Server } from "socket.io";
import { Server as HTTPServer } from "http";

export class WebSocketService {
  private io: Server;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer);
  }

  public start(): void {
    this.io.on("connection", (socket) => {
      console.log("Клиент подключён");

      socket.on("message", (data) => {
        console.log("Сообщение от клиента:", data);
        socket.emit("message", `Вы отправили: ${data}`);
      });

      socket.on("disconnect", () => {
        console.log("Клиент отключился");
      });
    });
  }
}
