import { LinkData, Model, NodeData } from "../../entity/BotModel";
import { IChatIO } from "../../boundary/io/IChatIO";

class ChatInterpreter {
  private currentNode: NodeData | undefined = undefined;
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private output: IChatIO;
  private variables: Map<string, string | number | boolean> = new Map();
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
      const response = await fetch(`/external-api?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      const clinicsList = data.clinics.map((clinic: any) => clinic.name).join("\n");
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
      this.output.sendMessage("Нет связей для перехода. Чат завершён.");
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
  }

  public start(): void {
    if (!this.currentNode) {
      this.output.sendMessage("Ошибка: не найден блок старта или их больше одного.");
      this.output.close();
      return;
    }
    this.processNode();
  }
}

export { ChatInterpreter };
