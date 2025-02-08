export enum ConnectorGroup {
    FUTURES = 'futures',
    SPOT = 'spot',
    OPTIONS = 'options'
}

export interface ConnectorConfiguration {
    symbol: string;
    apiKey?: string;
    apiSecret?: string;
    maxRetries?: number;
    timeout?: number;
}

export interface PublicExchangeConnector {
    connect(onMessage: (messages: Serializable[]) => void): Promise<void>;
    stop(): Promise<void>;
}

export type Serializable = Trade | Ticker | TopOfBook;
export type SklEvent = 'Trade' | 'Ticker' | 'TopOfBook';

export interface Ticker {
    symbol: string;
    connectorType: string;
    event: SklEvent;
    bid: number;
    bidSize: number;
    ask: number;
    askSize: number;
    dailyChange: number;
    dailyChangeRelative: number;
    lastPrice: number;
    volume: number;
    high: number;
    low: number;
    timestamp: number;
}

export interface TopOfBook {
    symbol: string;
    connectorType: string;
    event: SklEvent;
    timestamp: number;
    bid: number;
    bidSize: number;
    ask: number;
    askSize: number;
}

export interface Trade {
    symbol: string;
    connectorType: string;
    event: SklEvent;
    price: number;
    size: number;
    side: 'Buy' | 'Sell';
    timestamp: number;
}
