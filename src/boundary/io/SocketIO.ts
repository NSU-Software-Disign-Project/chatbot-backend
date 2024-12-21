import { Socket } from "socket.io";
import { IChatIO } from "./IChatIO";

class SocketIO implements IChatIO {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  close(): void {
    this.socket.disconnect(true);
  }

  getInput(prompt: string, callback: (input: string) => void): void {
    this.socket.emit("requestInput", prompt);
    this.socket.once("inputResponse", (input: string) => {
      callback(input);
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