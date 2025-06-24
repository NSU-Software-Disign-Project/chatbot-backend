interface NodeData {
  id: number;
  type: string;
  text?: string;
  variableName?: string;
  variableValue?: string | number | boolean;
  url?: string;
  isLoopStart?: boolean;
  isLoopEnd?: boolean;
  loopCondition?: string;
  loopVariable?: string;
  loopOperator?: string;
  loopValue?: string | number | boolean;
  maxIterations?: number;
  currentIteration?: number;
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