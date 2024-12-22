import { NodeData, LinkData } from '../../entity/BotModel';

// Функция для преобразования данных JSON в тип NodeData
export function jsonToNodeData(data: any): NodeData {
  return {
    id: data.id,
    type: data.type,
    text: data.text,
    variableName: data.variableName,
    variableValue: data.variableValue,
    conditions: data.conditions?.map((condition: any) => ({
      conditionId: condition.conditionId,
      variableName: condition.variableName,
      condition: condition.condition,
      conditionValue: condition.conditionValue,
      portId: condition.portId,
    })),
    choises: data.choises?.map((choise: any) => ({
      choiseId: choise.choiseId,
      text: choise.text,
      portId: choise.portId,
    })),
  };
}

// Функция для преобразования данных JSON в тип LinkData
export function jsonToLinkData(data: any): LinkData {
  return {
    from: data.from,
    to: data.to,
    fromPort: data.fromPort,
    toPort: data.toPort,
  };
}
