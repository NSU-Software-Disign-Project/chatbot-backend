import { Socket } from "socket.io";
import { IChatIO } from "./IChatIO";

class SocketIO implements IChatIO {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  sendMessage(message: string): void {
    this.socket.emit("message", message);
  }

  getInput(prompt: string, callback: (input: string) => void): void {
    this.socket.emit("input", prompt);
    this.socket.once("input", callback);
  }

  sendError(message: string): void {
    this.socket.emit("error", message);
  }

  close(): void {
    this.socket.disconnect(true);
  }
}

export { SocketIO };