import { LinkData, Model, NodeData } from "../../entity/BotModel";
import { IChatIO } from "../../boundary/io/IChatIO";

interface LoopContext {
  startNodeId: number;
  endNodeId: number;
  currentIteration: number;
  maxIterations: number;
  condition: string;
  variable: string;
  operator: string;
  value: string | number | boolean;
}

class ChatInterpreter {
  private currentNode: NodeData | undefined = undefined;
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private output: IChatIO;
  private variables: Map<string, string | number | boolean> = new Map();
  private loopStack: LoopContext[] = [];
  private isInLoop: boolean = false;

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
    const conditionCheckers: Record<string, (a: any, b: any) => boolean> = {
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
      ">": (a, b) => a > b,
      "<": (a, b) => a < b,
      "==": (a, b) => a === b,
      "!=": (a, b) => a !== b,
    };

    return conditionCheckers[operator]?.(variableValue, conditionValue) ?? false;
  }

  private getLinksFromNode(nodeId: number): LinkData[] {
    return this.model.linkDataArray.filter((link) => link.from === nodeId);
  }

  private handleConditionalBlock(
    conditions: NodeData["conditions"],
    links: LinkData[]
  ): void {
    for (const condition of conditions!) {
      const variableValue = this.variables.get(condition.variableName);
      const conditionMet = this.checkCondition(variableValue, condition.condition, condition.conditionValue);

      console.log(`Condition: ${condition.variableName} ${condition.condition} ${condition.conditionValue} = ${conditionMet}`);

      if (conditionMet) {
        const nextLink = links.find((link) => link.fromPort === condition.portId);
        if (nextLink) {
          this.currentNode = this.nodeMap.get(nextLink.to);
          this.processNode();
          return;
        }
      }
    }

    // Default переход (если условия не выполнены)
    const defaultLink = links.find((link) => link.fromPort === "OUT");
    if (defaultLink) {
      this.currentNode = this.nodeMap.get(defaultLink.to)
      this.processNode();
    } else {
      this.output.sendMessage("Нет связи по умолчанию из блока с условиями.");
      this.currentNode = undefined;
    }
  }

  private async handleOptionsBlock(choises: NodeData["choises"], links: LinkData[]): Promise<void> {
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
          this.processNode();
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
    if (links.length === 1) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
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
          this.processNode();
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

  private checkLoopCondition(loopContext: LoopContext): boolean {
    const variableValue = this.variables.get(loopContext.variable);
    const conditionCheckers: Record<string, (a: any, b: any) => boolean> = {
      ">=": (a, b) => a >= b,
      "<=": (a, b) => a <= b,
      ">": (a, b) => a > b,
      "<": (a, b) => a < b,
      "==": (a, b) => a === b,
      "!=": (a, b) => a !== b,
    };

    const conditionMet = conditionCheckers[loopContext.operator]?.(variableValue, loopContext.value) ?? false;
    const iterationLimitMet = loopContext.currentIteration < loopContext.maxIterations;

    return conditionMet && iterationLimitMet;
  }

  private handleLoopStart(node: NodeData): void {
    const loopContext: LoopContext = {
      startNodeId: node.id,
      endNodeId: -1, // Будет найдено при обработке loopEnd
      currentIteration: 0,
      maxIterations: node.maxIterations || 100,
      condition: node.loopCondition || "",
      variable: node.loopVariable || "",
      operator: node.loopOperator || "==",
      value: node.loopValue || ""
    };

    // Инициализируем переменную цикла если она не существует
    if (!this.variables.has(loopContext.variable)) {
      this.variables.set(loopContext.variable, 0);
    }

    this.loopStack.push(loopContext);
    this.isInLoop = true;
    this.output.sendMessage(`Начало цикла (итерация ${loopContext.currentIteration + 1}/${loopContext.maxIterations})`);
  }

  private handleLoopEnd(node: NodeData): void {
    if (this.loopStack.length === 0) {
      this.output.sendError("Ошибка: найден блок окончания цикла без соответствующего начала");
      this.currentNode = undefined;
      return;
    }

    const currentLoop = this.loopStack[this.loopStack.length - 1];
    currentLoop.endNodeId = node.id;
    currentLoop.currentIteration++;

    // Увеличиваем счетчик цикла
    const currentValue = this.variables.get(currentLoop.variable) || 0;
    this.variables.set(currentLoop.variable, Number(currentValue) + 1);

    if (this.checkLoopCondition(currentLoop)) {
      // Продолжаем цикл - возвращаемся к началу
      this.currentNode = this.nodeMap.get(currentLoop.startNodeId);
      this.output.sendMessage(`Продолжение цикла (итерация ${currentLoop.currentIteration + 1}/${currentLoop.maxIterations})`);
    } else {
      // Выходим из цикла
      this.loopStack.pop();
      this.isInLoop = this.loopStack.length > 0;
      this.output.sendMessage(`Завершение цикла после ${currentLoop.currentIteration} итераций`);
      
      // Переходим к следующему блоку после цикла
      this.moveToNextNode(this.getLinksFromNode(node.id));
    }
  }

  private async processNode(): Promise<void> {
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

      case "loopStartBlock":
        this.handleLoopStart(this.currentNode);
        this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
        break;

      case "loopEndBlock":
        this.handleLoopEnd(this.currentNode);
        break;

      default:
        this.output.sendMessage(`Неизвестный тип блока: ${type}`);
    }
  }

  public start(): void {
    if (!this.currentNode) {
      this.output.sendMessage("Ошибка: не найден блок старта или их больше одного.");
      this.output.close();
      return;
    }
    this.processNode();
  }

  // Новый метод для обработки пользовательских сообщений в постоянном режиме
  public async handleUserMessage(message: string): Promise<void> {
    if (!this.currentNode) {
      this.output.sendMessage("Бот не активен. Используйте /restart для перезапуска.");
      return;
    }

    // Сохраняем сообщение пользователя в переменную для использования в блоках
    this.variables.set("userMessage", message);
    
    // Если бот ожидает ввода, обрабатываем его
    if (this.currentNode.type === "saveBlock") {
      this.variables.set(this.currentNode.variableName!, message);
      this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
    } else if (this.currentNode.type === "optionsBlock") {
      // Обрабатываем выбор пользователя в options блоке
      await this.handleUserChoice(message);
    } else {
      // Для других блоков просто продолжаем выполнение
      this.processNode();
    }
  }

  private async handleUserChoice(choice: string): Promise<void> {
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
}

export { ChatInterpreter };
