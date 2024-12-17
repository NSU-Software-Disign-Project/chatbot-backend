import { LinkData, Model, NodeData } from "./BotModel";
import { IChatIO } from "./io/IChatIO";

class ChatInterpreter {
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private variables: Map<string, string | number | boolean> = new Map();
  private currentNode: NodeData | undefined = undefined;
  private output: IChatIO;

  constructor(model: Model, output: IChatIO) {
    this.model = model;
    this.output = output;
    this.prepareNodeMap();
    const startNode = model.nodeDataArray.find((node) => node.type === "startBlock");
    this.currentNode = startNode || undefined;
  }

  private prepareNodeMap(): void {
    this.model.nodeDataArray.forEach((node) => {
      this.nodeMap.set(node.id, node);
    });
  }

  private getLinksFromNode(nodeId: number): LinkData[] {
    return this.model.linkDataArray.filter((link) => link.from === nodeId);
  }

  public start(): void {
    if (!this.currentNode) {
      this.output.sendMessage("Не найден стартовый блок!");
      this.output.close();
      return;
    }
    this.processNode();
  }

  private processNode(): void {
    if (!this.currentNode) {
      this.output.sendMessage(`Ошибка: не найден блок`);
      return;
    }

    const { type, text, variableName, variableValue, conditions, choises } = this.currentNode;

    switch (type) {
      case "startBlock":
        this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
        break;

      case "messageBlock":
        this.output.sendMessage(this.interpolateMessage(text || ""));
        this.moveToNextNode(this.getLinksFromNode(this.currentNode.id));
        break;

      case "saveBlock":
        this.output.getInput(`Введите значение для "${variableName}": `, (input) => {
          this.variables.set(variableName!, input);
          this.moveToNextNode(this.getLinksFromNode(this.currentNode!.id));
        });
        break;

      case "conditionalBlock":
        this.handleConditionalBlock(conditions || [], this.getLinksFromNode(this.currentNode.id));
        break;

      case "optionsBlock":
        this.handleOptionsBlock(choises, this.getLinksFromNode(this.currentNode.id));
        break;

      default:
        this.output.sendMessage(`Неизвестный тип блока: ${type}`);
    }
  }

  private handleConditionalBlock(
    conditions: NodeData["conditions"],
    links: LinkData[]
  ): void {
    for (const condition of conditions!) {
      const variableValue = this.variables.get(condition.variableName);
      const conditionMet = this.checkCondition(variableValue, condition.condition, condition.conditionValue);

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
    const defaultLink = links.find((link) => link.fromPort === "OUT0");
    if (defaultLink) {
      this.currentNode = this.nodeMap.get(defaultLink.to)
      this.processNode();
    } else {
      this.output.sendMessage("Нет связи по умолчанию из блока с условиями.");
      this.currentNode = undefined;
    }
  }

  private handleOptionsBlock(choises: NodeData["choises"], links: LinkData[]): void {
    if (!choises || choises.length === 0) {
      this.output.sendMessage("Нет вариантов для выбора.");
      this.currentNode = undefined;
      return;
    }

    const options = choises.map((choice, index) => `${index + 1}. ${choice.text}`).join("\n");
    this.output.getInput(`Выберите вариант:\n${options}\n`, (input) => {
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
    });
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

  private interpolateMessage(message: string): string {
    return message.replace(/{(.*?)}/g, (_, varName) => {
        const value = this.variables.get(varName);
        return value !== undefined ? String(value) : `{${varName}}`;
    });
}


  private moveToNextNode(links: LinkData[]): void {
    if (links.length === 1) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
    } else if (links.length > 1) {
      const options = links.map((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        return `${index + 1}. ${toNode?.text || "Следующий шаг"}`;
      }).join("\n");

      this.output.getInput(`Выберите действие:\n${options}`, (input) => {
        const choiceIndex = parseInt(input, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < links.length) {
          this.currentNode = this.nodeMap.get(links[choiceIndex].to);
          this.processNode();
        } else {
          this.output.sendMessage("Неверный выбор.");
          this.currentNode = undefined;
        }
      });
    } else {
      this.output.sendMessage("Нет связей для перехода. Чат завершён.");
      this.output.close();
      this.currentNode = undefined;
    }
  }
}

export { ChatInterpreter };
