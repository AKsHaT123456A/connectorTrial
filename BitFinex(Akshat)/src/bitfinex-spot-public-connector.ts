import { ConnectorConfiguration, ConnectorGroup, PublicExchangeConnector, Serializable, SklEvent, Ticker, TopOfBook, Trade } from "./types";
import { WebSocket } from 'ws';
import { getSklSymbol } from "./spot";
import { Logger } from "./utils/logger";

export interface BitfinexTicker {
    bid: number;
    bidSize: number;
    ask: number;
    askSize: number;
    lastPrice: number;
    volume: number;
    high: number;
    low: number;
    dailyChange: number;
    dailyChangeRelative: number;
}

const logger = Logger.getInstance("bitfinex-spot-public-connector");


//in the documentation of bitnex,the ticker does the work of TopOfBook itself so
// i made a distinction between them 
export class BitfinexSpotPublicConnector implements PublicExchangeConnector {
    public publicWebsocketAddress = "wss://api-pub.bitfinex.com/ws/2";
    public publicWSFeed: WebSocket | null = null;
    private exchangeSymbol: string;
    private sklSymbol: string;
    private channelMap: Map<number, string> = new Map();
    private heartbeatTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private readonly HEARTBEAT_INTERVAL = 20000; // 20 seconds
    private readonly PING_INTERVAL = 10000; // 10 seconds

    constructor(private group: ConnectorGroup, private config: ConnectorConfiguration) {
        this.exchangeSymbol = this.config.symbol;
        this.sklSymbol = getSklSymbol(this.group, this.config);
    }

    public async connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                logger.log(`Connecting to Bitfinex WebSocket`);
                this.publicWSFeed = socket || new WebSocket(this.publicWebsocketAddress);

                this.publicWSFeed.on("open", () => {
                    logger.log("WebSocket connection opened.");
                    this.subscribeToChannel("trades");
                    this.subscribeToChannel("ticker");
                    this.startPingPong();
                    this.resetHeartbeat();

                    resolve();
                });

                this.publicWSFeed.on("message", (data) => {
                    try {
                        const parsedData = JSON.parse(data.toString());
                        this.resetHeartbeat();
                        if (Array.isArray(parsedData) && parsedData.length === 2 && parsedData[1] === "hb") {
                            return;
                        }

                        if (parsedData.event === "subscribed") {
                            this.channelMap.set(parsedData.chanId, parsedData.channel);
                        } else if (Array.isArray(parsedData) && parsedData.length > 1) {
                            const channelId = parsedData[0];
                            const channelType = this.channelMap.get(channelId);
                            if (channelType) {
                                const serializableMessages: Serializable[] = this.createSklEvent(channelType, parsedData[1]);
                                console.log("Processed Messages:", serializableMessages);
                                onMessage(serializableMessages);
                            }
                        }
                    } catch (err) {
                        logger.error(`Error processing WebSocket message: ${err}`);
                    }
                });

                this.publicWSFeed.on("error", (err) => {
                    logger.error(`WebSocket error: ${err}`);
                    reject(err);
                });

                this.publicWSFeed.on("close", (code, reason) => {
                    logger.log(`WebSocket closed: ${code} - ${reason}`);
                    this.cleanup();
                    setTimeout(() => {
                        logger.log("Reconnecting to WebSocket...");
                        this.connect(onMessage).catch(reject);
                    }, 5000);
                });
            } catch (error) {
                logger.error(`Error during WebSocket connection setup: ${error}`);
                reject(error);
            }
        });
    }

    private subscribeToChannel(channel: string): void {
        const message = JSON.stringify({
            event: "subscribe",
            channel,
            symbol: this.exchangeSymbol
        });
        this.publicWSFeed?.send(message);
    }

    private startPingPong(): void {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.publicWSFeed?.readyState === WebSocket.OPEN) {
                logger.log("Sending ping...");
                this.publicWSFeed.ping();
            }
        }, this.PING_INTERVAL);
    }

    private resetHeartbeat(): void {
        if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = setTimeout(() => {
            logger.error("No message received - reconnecting...");
            this.publicWSFeed?.terminate(); 
        }, this.HEARTBEAT_INTERVAL + 5000); 
    }

    private createSklEvent(channelType: string, message: any): Serializable[] {
        if (channelType === "trades") {
            return [this.createTrade(message)];
        } else if (channelType === "ticker") {
            return [
                this.createTopOfBook(message),//it is serving as TopOfBook
                this.create24hTicker(message) //it is serving as Ticker
            ];
        }
        return [];
    }
    

    private createTrade(trade: any): Trade {
        return {
            symbol: this.sklSymbol,
            connectorType: "Bitfinex",
            event: "Trade",
            price: trade[3],
            size: trade[2],
            side: trade[2] > 0 ? "Buy" : "Sell",
            timestamp: trade[1],
        };
    }

    private createTopOfBook(ticker: any): TopOfBook {
        return {
            symbol: this.sklSymbol,
            connectorType: "Bitfinex",
            event: "TopOfBook",
            bid: ticker[0],
            bidSize: ticker[1],
            ask: ticker[2],
            askSize: ticker[3],
            timestamp: Date.now(),
        };
    }
    
    private create24hTicker(ticker: any): Ticker {
        return {
            symbol: this.sklSymbol,
            connectorType: "Bitfinex",
            event: "Ticker",
            bid: ticker[0],
            bidSize: ticker[1],
            ask: ticker[2],
            askSize: ticker[3],
            dailyChange: ticker[4],
            dailyChangeRelative: ticker[5],
            lastPrice: ticker[6],
            volume: ticker[7],
            high: ticker[8],
            low: ticker[9],
            timestamp: Date.now(),
        };
    }

    public async stop(): Promise<void> {
        this.cleanup();
        if (this.publicWSFeed) {
            this.publicWSFeed.close(1000, "Client requested disconnection");
        }
    }

    private cleanup(): void {
        if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.heartbeatTimeout = null;
        this.pingInterval = null;
    }
}
