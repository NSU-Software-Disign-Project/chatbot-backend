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
  
  const jsonModel = {
    "class": "GraphLinksModel",
    "linkFromPortIdProperty": "fromPort",
    "linkToPortIdProperty": "toPort",
    "nodeDataArray": [
      { "key": 0, "category": "startBlock" },
      { "key": 1, "category": "messageBlock", "message": "Hey there! Let's see if u can drink beer!" },
      { "key": 2, "category": "conditionalBlock", "value": "age", "condition": ">=", "conditionValue": "18" },
      { "key": 3, "category": "optionsBlock", "additionalTexts": [{ "text": "Lager" }, { "text": "Stout", "portId": "OUT1" }, { "text": "IPA", "portId": "OUT2" }] },
      { "key": 4, "category": "saveBlock", "name": "age", "value": "value"},
      { "key": 5, "category": "messageBlock", "message": "Please tell me how old are u?" },
      { "key": 6, "category": "messageBlock", "message": "OH YEAHH! Let's drink some beer!" },
      { "key": 7, "category": "messageBlock", "message": "Which one do u want?" },
      { "key": 8, "category": "messageBlock", "message": "HELL NO MAN" },
      { "key": 9, "category": "messageBlock", "message": "Here's your Lager" },
      { "key": 10, "category": "messageBlock", "message": "Here's your Stout" },
      { "key": 11, "category": "messageBlock", "message": "Here's your IPA" }
    ],
    "linkDataArray": [
      { "from": 0, "to": 1, "fromPort": "OUT", "toPort": "IN" },
      { "from": 1, "to": 5, "fromPort": "OUT", "toPort": "IN" },
      { "from": 5, "to": 4, "fromPort": "OUT", "toPort": "IN" },
      { "from": 4, "to": 2, "fromPort": "OUT", "toPort": "IN" },
      { "from": 2, "to": 6, "fromPort": "OUT1", "toPort": "IN" },
      { "from": 6, "to": 7, "fromPort": "OUT", "toPort": "IN" },
      { "from": 7, "to": 3, "fromPort": "OUT", "toPort": "IN" },
      { "from": 2, "to": 8, "fromPort": "OUT2", "toPort": "IN" },
      { "from": 3, "to": 9, "fromPort": "", "toPort": "IN" },
      { "from": 3, "to": 10, "fromPort": "OUT1", "toPort": "IN" },
      { "from": 3, "to": 11, "fromPort": "OUT2", "toPort": "IN" }
    ]
  };
  
  const chat = new ChatInterpreter(jsonModel);
  chat.start();
  