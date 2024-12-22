import * as readline from "readline";
import { IChatIO } from "./IChatIO";

class ConsoleChatIO implements IChatIO {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  // Метод для отправки сообщения
  sendMessage(message: string): void {
    console.log(message);
  }

  // Метод для получения ввода от пользователя
  getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  // Метод завершения работы
  close(): void {
    this.rl.close();
  }

  sendError(message: string): void {
    console.error(message);
  }
}

export { ConsoleChatIO };