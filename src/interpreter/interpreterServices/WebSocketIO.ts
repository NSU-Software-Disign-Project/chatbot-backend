import { IChatIO } from "./IChatIO";
import { WebSocketServer, WebSocket } from "ws";

class WebSocketIO implements IChatIO {
    private ws: WebSocket;
  
    constructor(ws: WebSocket) {
      this.ws = ws;
    }
  
    sendMessage(message: string): void {
      this.ws.send(JSON.stringify({ type: "message", data: message }));
    }
  
    getInput(prompt: string, callback: (input: string) => void): void {
      this.ws.send(JSON.stringify({ type: "input", data: prompt }));
  
      const handleMessage = (message: string) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === "input") {
            this.ws.off("message", handleMessage); // Удаляем обработчик после получения ввода
            callback(parsed.data);
          }
        } catch (e) {
          this.sendMessage("Ошибка: Неверный формат сообщения.");
        }
      };
  
      this.ws.on("message", handleMessage);
    }
  
    close(): void {
      this.ws.close();
    }
  }

  export { WebSocketIO };