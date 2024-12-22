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

export { NodeData, LinkData, Model };