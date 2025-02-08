import { Logger } from "./utils/logger";

// const logger = Logger.getInstance('bitmex-public-connector');

export const getSklSymbol = (group: any, config: any) => {
    return `${config.symbol}`;
}