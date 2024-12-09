import { IChatIO } from "./interpreterServices/IChatIO";

interface NodeData {
  id: number;
  type: string;
  text?: string;
  variableName?: string;
  variableValue?: string | number | boolean;
  conditions?: { 
    conditionId: number;
    variableName: string;
    condition: string;
    conditionValue: string | number | boolean;
    portId: string;
  }[];
  choises?: {
    choiseId: number;
    text: string;
    portId: string;
  }[];
}

interface LinkData {
  from: number;
  to: number;
  fromPort?: string;
  toPort?: string;
}

interface Model {
  nodeDataArray: NodeData[];
  linkDataArray: LinkData[];
}

class ChatInterpreter {
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private variables: Record<string, string | number | boolean> = {};
  private currentNodeId: number | null = null;
  private output: IChatIO;

  constructor(model: Model, output: IChatIO) {
    this.model = model;
    this.output = output;
    this.prepareNodeMap();
    const startNode = model.nodeDataArray.find((node) => node.type === "startBlock");
    this.currentNodeId = startNode ? startNode.id : null;
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
    if (this.currentNodeId === null) {
      this.output.sendMessage("Не найден стартовый блок!");
      this.output.close();
      return;
    }

    while (this.currentNodeId !== null) {
      this.processNode();
    }

    this.output.sendMessage("Чат завершён!");
    this.output.close();
  }

  private processNode(): void {
    const currentNode = this.nodeMap.get(this.currentNodeId!);
    if (!currentNode) {
      this.output.sendMessage(`Ошибка: не найден блок с ID ${this.currentNodeId}`);
      this.currentNodeId = null;
      return;
    }

    const { type, text, variableName, variableValue, conditions, choises } = currentNode;

    switch (type) {
      case "startBlock":
        this.moveToNextNode(this.getLinksFromNode(currentNode.id));
        break;

      case "messageBlock":
        this.output.sendMessage(this.interpolateMessage(text || ""));
        this.moveToNextNode(this.getLinksFromNode(currentNode.id));
        break;

      case "saveBlock":
        this.output.getInput(`Введите значение для "${variableName}": `, (input) => {
          this.variables[variableName!] = input;
          this.moveToNextNode(this.getLinksFromNode(currentNode.id));
        });
        break;

      case "conditionalBlock":
        this.handleConditionalBlock(conditions || [], this.getLinksFromNode(currentNode.id));
        break;

      case "optionsBlock":
        this.handleOptionsBlock(choises, this.getLinksFromNode(currentNode.id));
        break;

      default:
        this.output.sendMessage(`Неизвестный тип блока: ${type}`);
        this.currentNodeId = null;
    }
  }

  private handleConditionalBlock(
    conditions: NodeData["conditions"],
    links: LinkData[]
  ): void {
    for (const condition of conditions!) {
      const variableValue = this.variables[condition.variableName];
      const conditionMet = this.checkCondition(variableValue, condition.condition, condition.conditionValue);

      if (conditionMet) {
        const nextLink = links.find((link) => link.fromPort === condition.portId);
        if (nextLink) {
          this.currentNodeId = nextLink.to;
          return;
        }
      }
    }

    // Default переход (если условия не выполнены)
    const defaultLink = links.find((link) => !link.fromPort);
    if (defaultLink) {
      this.currentNodeId = defaultLink.to;
    } else {
      this.output.sendMessage("Нет связи по умолчанию из блока с условиями.");
      this.currentNodeId = null;
    }
  }

  private handleOptionsBlock(choises: NodeData["choises"], links: LinkData[]): void {
    if (!choises || choises.length === 0) {
      this.output.sendMessage("Нет вариантов для выбора.");
      this.currentNodeId = null;
      return;
    }

    const options = choises.map((choice, index) => `${index + 1}. ${choice.text}`).join("\n");
    this.output.getInput(`Выберите вариант:\n${options}`, (input) => {
      const choiceIndex = parseInt(input, 10) - 1;

      if (choiceIndex >= 0 && choiceIndex < choises.length) {
        const chosenOption = choises[choiceIndex];
        const nextLink = links.find((link) => link.fromPort === chosenOption.portId);

        if (nextLink) {
          this.currentNodeId = nextLink.to;
          return;
        }
      }
      this.output.sendMessage("Неверный выбор.");
      this.currentNodeId = null;
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
        const value = this.variables[varName];
        return value !== undefined ? String(value) : `{${varName}}`;
    });
}


  private moveToNextNode(links: LinkData[]): void {
    if (links.length === 1) {
      this.currentNodeId = links[0].to;
    } else if (links.length > 1) {
      const options = links.map((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        return `${index + 1}. ${toNode?.text || "Следующий шаг"}`;
      }).join("\n");

      this.output.getInput(`Выберите действие:\n${options}`, (input) => {
        const choiceIndex = parseInt(input, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < links.length) {
          this.currentNodeId = links[choiceIndex].to;
        } else {
          this.output.sendMessage("Неверный выбор.");
          this.currentNodeId = null;
        }
      });
    } else {
      this.output.sendMessage("Нет связей для перехода. Чат завершён.");
      this.currentNodeId = null;
    }
  }
}

export { ChatInterpreter };
