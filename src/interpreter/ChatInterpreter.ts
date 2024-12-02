import { IChatIO } from "./interpreterServices/IChatIO";

interface NodeData {
  key: number;
  category: string;
  message?: string;
  name?: string;
  value?: string;
  condition?: string;
  conditionValue?: string;
  additionalTexts?: { text: string; portId?: string }[];
}

interface LinkData {
  from: number;
  to: number;
  fromPort?: string;
}

interface Model {
  nodeDataArray: NodeData[];
  linkDataArray: LinkData[];
}

class ChatInterpreter {
  private model: Model;
  private nodeMap: Map<number, NodeData> = new Map();
  private variables: Record<string, string> = {};
  private currentNode: NodeData | undefined;
  private output: IChatIO;

  constructor(model: Model, output: IChatIO) {
    this.model = model;
    this.output = output;
    this.currentNode = model.nodeDataArray.find((node) => node.category === "startBlock");
    this.prepareNodeMap();
  }

  private prepareNodeMap(): void {
    this.model.nodeDataArray.forEach((node) => {
      this.nodeMap.set(node.key, node);
    });
  }

  private getLinksFromCurrentNode(): LinkData[] {
    if (!this.currentNode) return [];
    return this.model.linkDataArray.filter((link) => link.from === this.currentNode!.key);
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
      this.output.sendMessage("Чат завершен!");
      this.output.close();
      return;
    }

    const { category, message, name, value, condition, conditionValue, additionalTexts } = this.currentNode;

    switch (category) {
      case "startBlock":
        this.handleStartBlock();
        break;

      case "messageBlock":
        this.output.sendMessage(this.interpolateMessage(message || ""));
        this.moveNext(this.getLinksFromCurrentNode());
        break;

      case "saveBlock":
        this.handleSaveBlock(name || "");
        break;

      case "conditionalBlock":
        this.handleConditionalBlock(value || "", condition || "", conditionValue || "");
        break;

      case "optionsBlock":
        this.handleOptionsBlock(additionalTexts || []);
        break;

      default:
        this.output.sendMessage(`Неизвестный тип блока: ${category}`);
        this.output.close();
    }
  }

  private handleStartBlock(): void {
    const links = this.getLinksFromCurrentNode();
    if (links.length) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
    } else {
      this.output.sendMessage("Чат завершен! (Нет связей из стартового блока)");
      this.output.close();
    }
  }

  private handleSaveBlock(name: string): void {
    this.output.getInput(`Введите значение для "${name}": `, (input) => {
      this.variables[name] = input;
      this.moveNext(this.getLinksFromCurrentNode());
    });
  }

  private handleConditionalBlock(value: string, condition: string, conditionValue: string | number): void {
    const variableValue = parseFloat(this.variables[value]);
    const targetValue = parseFloat(conditionValue as string);

    const conditionCheckers: { [key: string]: (a: number, b: number) => boolean } = {
      '>=': (a, b) => a >= b,
      '<=': (a, b) => a <= b,
      '>': (a, b) => a > b,
      '<': (a, b) => a < b,
      '==': (a, b) => a === b,
      '!=': (a, b) => a !== b,
    };

    const isConditionMet = conditionCheckers[condition]?.(variableValue, targetValue);

    const nextLink = isConditionMet
      ? this.getLinksFromCurrentNode().find((link) => link.fromPort === 'OUT1')
      : this.getLinksFromCurrentNode().find((link) => link.fromPort === 'OUT2');
  
    if (nextLink) {
      this.currentNode = this.nodeMap.get(nextLink.to);
      this.processNode();
    } else {
      this.output.sendMessage("Нет подходящей связи для перехода. Условие не выполнено.");
      this.output.close();
    }
  }
  

  private handleOptionsBlock(additionalTexts: { text: string; portId?: string }[]): void {
    const options = additionalTexts.map((option, index) => `${index + 1}. ${option.text}`).join("\n");
    this.output.getInput(`Выберите вариант:\n${options}`, (input) => {
      const choiceIndex = parseInt(input, 10) - 1;
      const chosenOption = additionalTexts[choiceIndex];

      if (chosenOption) {
        const links = this.getLinksFromCurrentNode();
        const nextLink = links.find((link) => link.fromPort === chosenOption.portId);
        if (nextLink) {
          this.currentNode = this.nodeMap.get(nextLink.to);
        } else {
          this.output.sendMessage("Нет связи для выбранного варианта.");
          this.output.close();
        }
      } else {
        this.output.sendMessage("Неверный выбор.");
      }

      this.processNode();
    });
  }

  private interpolateMessage(message: string): string {
    return message.replace(/{(.*?)}/g, (_, varName) => this.variables[varName] || `{${varName}}`);
  }

  private moveNext(links: LinkData[]): void {
    if (links.length === 1) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
    } else if (links.length > 1) {
      const options = links.map((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        return `${index + 1}. ${toNode?.message || "Следующий шаг"}`;
      }).join("\n");

      this.output.getInput(`Выберите действие:\n${options}`, (input) => {
        const choiceIndex = parseInt(input, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < links.length) {
          this.currentNode = this.nodeMap.get(links[choiceIndex].to);
        } else {
          this.output.sendMessage("Неверный выбор.");
        }

        this.processNode();
      });
    } else {
      this.output.sendMessage("Нет связей для перехода. Чат завершен.");
      this.output.close();
    }
  }
}

export { ChatInterpreter };