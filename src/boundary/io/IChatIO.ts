export interface IChatIO {
    sendMessage(message: string): void;
    getInput(prompt: string): Promise<string>;
    sendError(message: string): void;
    close(): void;
}