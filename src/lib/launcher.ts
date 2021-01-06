import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import WebSocket from "ws";
import path from "path";

export class Launcher extends EventEmitter {
    private readonly username: string;
    private readonly token: string;
    private proc!: ChildProcess;
    private ws!: WebSocket;

    private started = false;

    constructor(token: string, username: string) {
        super();

        this.token = token;
        this.username = username;
    }

    public start(launcherPath: string): void {
        this.proc = spawn(path.resolve(launcherPath), [
            `burningsw://${this.token}/?username=${this.username}`,
        ]);

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.proc.on("error", () => {});

        this.proc.on("close", (code) => {
            this.emit("launcher_closed", code);

            if (this.ws.readyState > WebSocket.CONNECTING) this.ws.close();
            if (code !== 0) this.emit("error", new Error(`Process exited with error code ${code}`));
            else if (code === 0 && !this.started) this.start(launcherPath);
        });

        this.ws = new WebSocket(`wss://launcher.burningsw.to/ws`);

        this.ws.on("open", () => {
            this.emit("update", `Connecting to the launcher...`);
            this.ws.send(this.token);
        });

        this.ws.on("message", (evt) => {
            const data = JSON.parse(evt as string);

            if (this.ws.readyState > WebSocket.CONNECTING && this.ws.readyState < WebSocket.CLOSING)
                this.ws.send("ping");

            switch (data.type) {
                case 0:
                    this.emit("launcher_start");
                    this.emit("update", `Could not connect to the message broker server`);
                    break;
                case 1:
                    this.emit("launcher_start");
                    this.emit("update", `Connection established successfully!`);
                    break;
                case 2:
                    if (
                        !data.text ||
                        data.text.includes("Launcher connected") ||
                        data.text.includes("Starting the game client")
                    )
                        return;

                    if (data.speed) {
                        this.emit("file_download", {
                            text: data.text,
                            speed: data.speed,
                            progress: data.progress || 0,
                        });
                    } else {
                        this.emit("update", data.text);
                    }
                    break;
                case 3:
                    this.emit("update", `Game started`);
                    this.emit("game_started");
                    this.started = true;
                    break;
            }
        });
    }
}
