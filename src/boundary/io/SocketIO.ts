import { Socket } from "socket.io";
import { IChatIO } from "./IChatIO";

class SocketIO implements IChatIO {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  close(): void {
    this.socket.disconnect(true);
    console.log("Socket disconnected");
  }

  async getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.socket.emit("requestInput", prompt);
      this.socket.once("inputResponse", (input: string) => {
        resolve(input);
      });
    });
  }

  sendError(message: string): void {
    this.socket.emit("error", message);
  }

  sendMessage(message: string): void {
    this.socket.emit("message", message);
  }
}

export { SocketIO };