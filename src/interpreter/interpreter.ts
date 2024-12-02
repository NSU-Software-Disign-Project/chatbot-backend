import * as readline from "readline";

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

  private rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  constructor(model: Model) {
    this.model = model;
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
      console.error("Не найден стартовый блок!");
      this.rl.close();
      return;
    }
    this.processNode();
  }

  private processNode(): void {
    if (!this.currentNode) {
      console.log("Чат завершен!");
      this.rl.close();
      return;
    }

    const { category, message, name, value, condition, conditionValue, additionalTexts } = this.currentNode;

    switch (category) {
      case "startBlock":
        this.handleStartBlock();
        break;

      case "messageBlock":
        console.log(this.interpolateMessage(message || ""));
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
        console.error(`Неизвестный тип блока: ${category}`);
        this.rl.close();
    }
  }

  private handleStartBlock(): void {
    const links = this.getLinksFromCurrentNode();
    if (links.length) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
    } else {
      console.log("Чат завершен! (Нет связей из стартового блока)");
      this.rl.close();
    }
  }

  private handleSaveBlock(name: string): void {
    this.rl.question(`Введите значение для "${name}": `, (input) => {
      this.variables[name] = input;
      this.moveNext(this.getLinksFromCurrentNode());
    });
  }

  private handleConditionalBlock(value: string, condition: string, conditionValue: string | number): void {
    const variableValue = parseInt(this.variables[value], 10);
    const targetValue = parseInt(conditionValue as string, 10);
  
    let nextLink;
    if (condition === ">=" && variableValue >= targetValue) {
      nextLink = this.getLinksFromCurrentNode().find((link) => link.fromPort === "OUT1");
    } else {
      nextLink = this.getLinksFromCurrentNode().find((link) => link.fromPort === "OUT2");
    }
  
    if (nextLink) {
      this.currentNode = this.nodeMap.get(nextLink.to);
      this.processNode();
    } else {
      console.log("Нет подходящей связи для перехода. Условие не выполнено.");
      this.rl.close();
    }
  }
  

  private handleOptionsBlock(additionalTexts: { text: string; portId?: string }[]): void {
    console.log("Выберите вариант:");
    additionalTexts.forEach((option, index) => {
      console.log(`${index + 1}. ${option.text}`);
    });

    this.rl.question("Введите номер варианта: ", (input) => {
      const choiceIndex = parseInt(input, 10) - 1;
      const chosenOption = additionalTexts[choiceIndex];

      if (chosenOption) {
        const links = this.getLinksFromCurrentNode();
        const nextLink = links.find((link) => link.fromPort === chosenOption.portId);
        if (nextLink) {
          this.currentNode = this.nodeMap.get(nextLink.to);
        } else {
          console.log("Нет связи для выбранного варианта.");
          this.rl.close();
        }
      } else {
        console.log("Неверный выбор.");
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
      console.log("Выберите действие:");
      links.forEach((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        console.log(`${index + 1}. ${toNode?.message || "Следующий шаг"}`);
      });

      this.rl.question("Введите номер действия: ", (input) => {
        const choiceIndex = parseInt(input, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < links.length) {
          this.currentNode = this.nodeMap.get(links[choiceIndex].to);
        } else {
          console.log("Неверный выбор.");
        }

        this.processNode();
      });
    } else {
      console.log("Нет связей для перехода. Чат завершен.");
      this.rl.close();
    }
  }
}

export { ChatInterpreter };