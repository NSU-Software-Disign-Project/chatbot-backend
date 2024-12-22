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
      console.log("Input requested:", prompt);
      this.socket.once("inputResponse", (input: string) => {
        console.log("Input received:", input);
        resolve(input);
      });
    });
  }

  sendError(message: string): void {
    this.socket.emit("error", message);
    console.error("Error sent:", message);
  }

  sendMessage(message: string): void {
    this.socket.emit("message", message);
    console.log("Message sent:", message);
  }
}

export { SocketIO };