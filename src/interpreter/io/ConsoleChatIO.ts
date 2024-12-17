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
  getInput(prompt: string, callback: (input: string) => void): void {
    this.rl.question(prompt, (answer) => {
      callback(answer);
    });
  }

  // Метод завершения работы
  close(): void {
    this.rl.close();
  }

  sendError(message: string): void {
    throw new Error("Method not implemented.");
  }
}

export { ConsoleChatIO };