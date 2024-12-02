import { IChatIO } from "./IChatIO";
import { WebSocketServer, WebSocket } from "ws";

class WebSocketIO implements IChatIO {
    private ws: WebSocket;
  
    constructor(ws: WebSocket) {
      this.ws = ws;
    }
  
    sendMessage(message: string): void {
      this.ws.send(JSON.stringify({ type: "message", content: message }));
    }
  
    getInput(prompt: string, callback: (input: string) => void): void {
      this.sendMessage(prompt);
  
      const handleMessage = (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === "input") {
            this.ws.off("message", handleMessage); // Удаляем обработчик после получения ввода
            callback(data.content);
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