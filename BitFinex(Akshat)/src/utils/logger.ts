export class Logger {
    private static instances: Map<string, Logger> = new Map();
    private name: string;
  
    private constructor(name: string) {
      this.name = name;
    }
  
    public static getInstance(name: string): Logger {
      if (!Logger.instances.has(name)) {
        Logger.instances.set(name, new Logger(name));
      }
      return Logger.instances.get(name)!;
    }
  
    private formatMessage(level: string, message: string): string {
      return `[${new Date().toISOString()}] [${level}] [${this.name}] ${message}`;
    }
  
    public log(message: string): void {
      console.log(this.formatMessage('INFO', message));
    }
  
    public error(message: string): void {
      console.error(this.formatMessage('ERROR', message));
    }
  
    public warn(message: string): void {
      console.warn(this.formatMessage('WARN', message));
    }
  
    public debug(message: string): void {
      console.debug(this.formatMessage('DEBUG', message));
    }
  }