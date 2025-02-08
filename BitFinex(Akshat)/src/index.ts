import { BitfinexSpotPublicConnector } from "./bitfinex-spot-public-connector";
import { ConnectorGroup, ConnectorConfiguration, Serializable } from "./types";

const config: ConnectorConfiguration = {
    symbol: "tBTCUSD",
    maxRetries: 5,
    timeout: 10000
};

// Instantiate the connector
const connector = new BitfinexSpotPublicConnector(ConnectorGroup.SPOT, config);

// Define a message handler
const handleMessage = (messages: Serializable[]) => {
    console.log("Received messages:", messages);
};

// Start the WebSocket connection
connector.connect(handleMessage)
    .then(() => console.log("Connected to Bitfinex WebSocket"))
    .catch((err) => console.error("Connection failed:", err));

// Handle process termination (Graceful shutdown)
process.on("SIGINT", async () => {
    console.log("Closing connection...");
    await connector.stop();
    process.exit(0);
});
