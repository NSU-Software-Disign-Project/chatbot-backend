const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class ChatInterpreter {
  constructor(model) {
    this.model = model;
    this.nodeMap = new Map();
    this.variables = {};
    this.currentNode = model.nodeDataArray.find((node) => node.category === "startBlock");
    this.prepareNodeMap();
  }

  prepareNodeMap() {
    this.model.nodeDataArray.forEach((node) => {
      this.nodeMap.set(node.key, node);
    });
  }

  getLinksFromCurrentNode() {
    return this.model.linkDataArray.filter((link) => link.from === this.currentNode.key);
  }

  start() {
    if (!this.currentNode) {
      console.error("Не найден стартовый блок!");
      rl.close();
      return;
    }
    this.processNode();
  }

  processNode() {
    if (!this.currentNode) {
      console.log("Чат завершен!");
      rl.close();
      return;
    }

    const { category, message, name, value, condition, conditionValue, additionalTexts } = this.currentNode;

    if (category === "startBlock") {
      const links = this.getLinksFromCurrentNode();
      if (links.length) {
        this.currentNode = this.nodeMap.get(links[0].to);
        this.processNode();
      } else {
        console.log("Чат завершен! (Нет связей из стартового блока)");
        rl.close();
      }
    } else if (category === "messageBlock") {
      console.log(this.interpolateMessage(message));
      const links = this.getLinksFromCurrentNode();
      this.moveNext(links);
    } else if (category === "saveBlock") {
      rl.question(`Введите значение для "${name}": `, (input) => {
        this.variables[name] = input; // Сохраняем значение переменной
        const links = this.getLinksFromCurrentNode();
        this.moveNext(links);
      });
    } else if (category === "conditionalBlock") {
      const variableValue = parseInt(this.variables[value], 10);
      const targetValue = parseInt(conditionValue, 10);
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
        console.log("Нет подходящей связи для перехода.");
        rl.close();
      }
    } else if (category === "optionsBlock") {
      console.log("Выберите вариант:");
      additionalTexts.forEach((option, index) => {
        console.log(`${index + 1}. ${option.text}`);
      });

      rl.question("Введите номер варианта: ", (input) => {
        const choiceIndex = parseInt(input, 10) - 1;
        const chosenOption = additionalTexts[choiceIndex];

        if (chosenOption) {
          const links = this.getLinksFromCurrentNode();
          const nextLink = links.find((link) => link.fromPort === (chosenOption.portId || ""));
          if (nextLink) {
            this.currentNode = this.nodeMap.get(nextLink.to);
          } else {
            console.log("Нет связи для выбранного варианта.");
            rl.close();
          }
        } else {
          console.log("Неверный выбор.");
        }

        this.processNode();
      });
    } else {
      console.error(`Неизвестный тип блока: ${category}`);
      rl.close();
    }
  }

  interpolateMessage(message) {
    return message.replace(/{(.*?)}/g, (_, varName) => this.variables[varName] || `{${varName}}`);
  }

  moveNext(links) {
    if (links.length === 1) {
      this.currentNode = this.nodeMap.get(links[0].to);
      this.processNode();
    } else if (links.length > 1) {
      console.log("Выберите действие:");
      links.forEach((link, index) => {
        const toNode = this.nodeMap.get(link.to);
        console.log(`${index + 1}. ${toNode.message || "Следующий шаг"}`);
      });

      rl.question("Введите номер действия: ", (input) => {
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
        rl.close();
      }
    }
  }

// export { ChatInterpreter };

const jsonModel = require("./jsonModel.json");
const interpreter = new ChatInterpreter(jsonModel);
interpreter.start();