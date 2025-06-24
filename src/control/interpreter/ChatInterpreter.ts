import { LinkData, Model, NodeData } from "../../entity/BotModel";
import { IChatIO } from "../../boundary/io/IChatIO";


class ChatInterpreter {
  private currentNode: NodeData | undefined = undefined;
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private output: IChatIO;
  private variables: Map<string, string | number | boolean> = new Map();
  private isStopped = false;

  constructor(model: Model, output: IChatIO) {
    this.model = model;
    this.output = output;
    this.prepareNodeMap();
    const startNodes = model.nodeDataArray.filter((node) => node.type === "startBlock");
    if (startNodes.length !== 1) {
      this.currentNode = undefined;
    } else {
      this.currentNode = startNodes[0];
    }
  }

  private checkCondition(
    variableValue: string | number | boolean | undefined,
    operator: string,
    conditionValue: string | number | boolean
  ): boolean {
    const isNumberOp = [">=", "<=", ">", "<", "==", "!="].includes(operator);
    let a = variableValue;
    let b = conditionValue;
    if (isNumberOp && !isNaN(Number(a)) && !isNaN(Number(b))) {
      a = Number(a);
      b = Number(b);
    }
    // Убираем лишние кавычки вокруг строки
    if (typeof b === 'string' && /^".*"$/.test(b)) {
      b = b.slice(1, -1);
    }
    const conditionCheckers: Record<string, (a: any, b: any) => boolean> = {
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
      ">": (a, b) => a > b,
      "<": (a, b) => a < b,
      "==": (a, b) => a === b,
      "!=": (a, b) => a !== b,
    };
    return conditionCheckers[operator]?.(a, b) ?? false;
  }

  private getLinksFromNode(nodeId: number): LinkData[] {
    return this.model.linkDataArray.filter((link) => link.from === nodeId);
  }

  private handleConditionalBlock(
    conditions: NodeData["conditions"],
    links: LinkData[]
  ): void {
    // Сначала проверяем только условия, кроме default (portId === 'OUT')
    for (const condition of conditions!) {
      if (condition.portId === 'OUT') continue; // default не проверяем
      const variableValue = this.variables.get(condition.variableName);
      console.log(`DEBUG: variableValue =`, variableValue, typeof variableValue, '| conditionValue =', condition.conditionValue, typeof condition.conditionValue);
      const conditionMet = this.checkCondition(variableValue, condition.condition, condition.conditionValue);

      console.log(`Condition: ${condition.variableName} ${condition.condition} ${JSON.stringify(condition.conditionValue)} = ${conditionMet}`);

      if (conditionMet) {
        const nextLink = links.find((link) => link.fromPort === condition.portId);
        if (nextLink) {
          this.currentNode = this.nodeMap.get(nextLink.to);
          this.safeProcessNode();
          return;
        }
      }
    }

    // Default переход (если условия не выполнены)
    const defaultLink = links.find((link) => link.fromPort === "OUT");
    if (defaultLink) {
      this.currentNode = this.nodeMap.get(defaultLink.to)
      this.safeProcessNode();
    } else {
      this.currentNode = undefined;
      if (typeof this.output.close === "function") {
        this.output.close();
      }
    }
  }

  private async handleOptionsBlock(choises: NodeData["choises"], links: LinkData[]): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: handleOptionsBlock прерван из-за остановки.');
      return;
    }
    if (!choises || choises.length === 0) {
      this.output.sendMessage("Нет вариантов для выбора.");
      this.currentNode = undefined;
      return;
    }

    const options = choises.map((choice, index) => `${index + 1}. ${choice.text}`).join("\n");
    try {
      const input = await this.output.getInput(`Выберите вариант:\n${options}\n`);
      const choiceIndex = parseInt(input, 10) - 1;

      if (choiceIndex >= 0 && choiceIndex < choises.length) {
        const chosenOption = choises[choiceIndex];
        const nextLink = links.find((link) => link.fromPort === chosenOption.portId);

        if (nextLink) {
          this.currentNode = this.nodeMap.get(nextLink.to);
          await this.safeProcessNode();
          return;
        }
      }
      this.output.sendMessage("Неверный выбор.");
      this.currentNode = undefined;
    } catch (error) {
      this.output.sendError("Ошибка при обработке выбора.");
    }
  }

  private async handleApiBlock(url: string, variableName: string): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: handleApiBlock прерван из-за остановки.');
      return;
    }
    try {
      const decodedUrl = decodeURIComponent(url);
      const response = await fetch(decodedUrl);
      const data = await response.json();
      const clinicsList = data.clinics.map((clinic: any, index: number) => `${index + 1}. ${clinic.name}`).join("\n");
      this.variables.set(variableName, clinicsList);
      this.moveToNextNode(this.getLinksFromNode(this.currentNode!.id));
    } catch (error) {
      this.output.sendError(`Ошибка при запросе к API. ${error}`);
      this.currentNode = undefined;
    }
  }

  private interpolateMessage(message: string): string {
    return message.replace(/\$\{(.*?)\}/g, (_, varName) => {
      const value = this.variables.get(varName);
      return value !== undefined ? String(value) : `\${${varName}}`;
    });
  }

  private async moveToNextNode(links: LinkData[]): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: moveToNextNode прерван из-за остановки.');
      return;
    }
    if (links.length === 1) {
      this.currentNode = this.nodeMap.get(links[0].to);
      await this.safeProcessNode();
    } else if (links.length > 1) {
      const options = links.map((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        return `${index + 1}. ${toNode?.text || "Следующий шаг"}`;
      }).join("\n");

      try {
        const input = await this.output.getInput(`Выберите действие:\n${options}`);
        const choiceIndex = parseInt(input, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < links.length) {
          this.currentNode = this.nodeMap.get(links[choiceIndex].to);
          await this.safeProcessNode();
        } else {
          this.output.sendMessage("Неверный выбор.");
          this.currentNode = undefined;
        }
      } catch (error) {
        this.output.sendError("Ошибка при выборе действия.");
      }
    } else {
      // this.output.sendMessage("Нет связей для перехода. Чат завершён.");
      this.output.close();
      this.currentNode = undefined;
    }
  }

  private prepareNodeMap(): void {
    this.model.nodeDataArray.forEach((node) => {
      this.nodeMap.set(node.id, node);
    });
  }

  private async processNode(): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: processNode прерван из-за остановки.');
      return;
    }
    if (!this.currentNode) {
      this.output.sendMessage(`Ошибка: не найден блок`);
      return;
    }
    try {
      if (this.isStopped) {
        console.log('ChatInterpreter: processNode прерван из-за остановки.');
        return;
      }
      if (!this.currentNode) {
        this.output.sendMessage(`Ошибка: не найден блок`);
        return;
      }
      const { type, text, variableName, conditions, choises, url } = this.currentNode;

      switch (type) {
        case "startBlock":
          this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
          break;

        case "messageBlock":
          this.output.sendMessage(this.interpolateMessage(text || ""));
          this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
          break;

        case "saveBlock":
          const input = await this.output.getInput(`Введите значение для "${variableName}": `);
          this.variables.set(variableName!, input);
          this.moveToNextNode(this.getLinksFromNode(this.currentNode!.id));
          break;

        case "conditionalBlock":
          this.handleConditionalBlock(conditions || [], this.getLinksFromNode(this.currentNode.id));
          break;

        case "optionsBlock":
          this.handleOptionsBlock(choises, this.getLinksFromNode(this.currentNode.id));
          break;

        case "apiBlock":
          if (url && variableName) {
            await this.handleApiBlock(url, variableName);
          } else {
            this.output.sendMessage("Ошибка: отсутствует URL или имя переменной в API блоке.");
            this.currentNode = undefined;
          }
          break;

        default:
          this.output.sendMessage(`Неизвестный тип блока: ${type}`);
      }
    } catch (err: any) {
      if (err instanceof RangeError || (err && err.message && err.message.includes("Maximum call stack size exceeded"))) {
        this.isStopped = true;
        this.currentNode = undefined;
        this.output.sendError("Обнаружен бесконечный цикл: переполнение стека. Исполнение остановлено.");
      } else {
        throw err;
      }
    }
  }

  public start(): void {
    if (!this.currentNode) {
      this.output.sendMessage("Ошибка: не найден блок старта или их больше одного.");
      this.output.close();
      return;
    }
    try {
      this.processNode();
    } catch (err: any) {
      if (err instanceof RangeError || (err && err.message && err.message.includes("Maximum call stack size exceeded"))) {
        this.isStopped = true;
        this.currentNode = undefined;
        this.output.sendError("Обнаружен бесконечный цикл: переполнение стека. Исполнение остановлено.");
      } else {
        throw err;
      }
    }
  }

  // Новый метод для обработки пользовательских сообщений в постоянном режиме
  public async handleUserMessage(message: string): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: handleUserMessage прерван из-за остановки.');
      return;
    }
    if (!this.currentNode) {
      this.output.sendMessage("Бот не активен. Используйте /restart для перезапуска.");
      return;
    }

    // Сохраняем сообщение пользователя в переменную для использования в блоках
    this.variables.set("userMessage", message);
    
    // Если бот ожидает ввода, обрабатываем его
    if (this.currentNode.type === "saveBlock") {
      this.variables.set(this.currentNode.variableName!, message);
      await this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
    } else if (this.currentNode.type === "optionsBlock") {
      // Обрабатываем выбор пользователя в options блоке
      await this.handleUserChoice(message);
    } else {
      // Для других блоков просто продолжаем выполнение
      this.processNode();
    }
  }

  private async handleUserChoice(choice: string): Promise<void> {
    if (this.isStopped) {
      console.log('ChatInterpreter: handleUserChoice прерван из-за остановки.');
      return;
    }
    if (!this.currentNode || this.currentNode.type !== "optionsBlock") return;

    const choices = this.currentNode.choises;
    if (!choices || choices.length === 0) {
      this.output.sendMessage("Нет вариантов для выбора.");
      this.currentNode = undefined;
      return;
    }

    const choiceIndex = parseInt(choice, 10) - 1;
    if (choiceIndex >= 0 && choiceIndex < choices.length) {
      const chosenOption = choices[choiceIndex];
      const links = this.getLinksFromNode(this.currentNode.id);
      const nextLink = links.find((link) => link.fromPort === chosenOption.portId);

      if (nextLink) {
        this.currentNode = this.nodeMap.get(nextLink.to);
        this.processNode();
        return;
      }
    }
    
    this.output.sendMessage("Неверный выбор. Попробуйте еще раз.");
  }

  public stop() {
    this.isStopped = true;
    console.log('ChatInterpreter: Остановлен по запросу.');
  }

  // Безопасный вызов processNode с обработкой RangeError
  private async safeProcessNode(): Promise<void> {
    try {
      await this.processNode();
    } catch (err: any) {
      if (err instanceof RangeError || (err && err.message && err.message.includes("Maximum call stack size exceeded"))) {
        this.isStopped = true;
        this.currentNode = undefined;
        this.output.sendError("Обнаружен бесконечный цикл: переполнение стека. Исполнение остановлено.");
      } else {
        throw err;
      }
    }
  }
}

export { ChatInterpreter };
