export class ChatInterpreter {
    private model: any;
    private nodeMap: Map<number, any>;
    private currentNode: any;
    public onMessage: ((msg: string) => void) | null = null;
    public onEnd: (() => void) | null = null;
  
    constructor(model: any) {
      this.model = model;
      this.nodeMap = new Map();
      this.currentNode = model.nodeDataArray.find((node: { category: string; }) => node.category === "startBlock");
      this.prepareNodeMap();
    }
  
    private prepareNodeMap() {
      this.model.nodeDataArray.forEach((node: any) => {
        this.nodeMap.set(node.key, node);
      });
    }
  
    private sendMessage(message: string) {
      if (this.onMessage) {
        this.onMessage(message);
      } else {
        console.log(message);
      }
    }
  
    public start() {
      if (!this.currentNode) {
        this.sendMessage("Не найден стартовый блок!");
        if (this.onEnd) this.onEnd();
        return;
      }
      this.processNode();
    }
  
    private processNode() {
      if (!this.currentNode) {
        this.sendMessage("Чат завершен!");
        if (this.onEnd) this.onEnd();
        return;
      }
  
      const { category, message } = this.currentNode;
  
      if (category === "messageBlock") {
        this.sendMessage(message);
        const links = this.getLinksFromCurrentNode();
        this.moveNext(links);
      } else if (category === "endBlock") {
        this.sendMessage("Чат завершен.");
        if (this.onEnd) this.onEnd();
      }
    }
  
    private getLinksFromCurrentNode(): any[] {
      return this.model.linkDataArray.filter((link: any) => link.from === this.currentNode.key);
    }
  
    private moveNext(links: any[]) {
      if (links.length === 0) {
        this.sendMessage("Нет дальнейших связей.");
        if (this.onEnd) this.onEnd();
      } else {
        this.currentNode = this.nodeMap.get(links[0].to);
        this.processNode();
      }
    }
  }
  