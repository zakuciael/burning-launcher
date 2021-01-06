import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import isAdmin from "is-admin";
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

    public async start(launcherPath: string): Promise<void> {
        this.emit("update", `Spawning launcher process`);

        if (!(await isAdmin())) {
            this.emit("error", new Error("You need to run the program as the administrator"));
            return;
        }

        this.proc = spawn(path.resolve(launcherPath), [
            `burningsw://${this.token}/?username=${this.username}`,
        ]);

        this.ws = new WebSocket(`wss://launcher.burningsw.to/ws`);

        this.ws.on("open", () => {
            this.emit("update", `Authenticating to the launcher API`);
            this.ws.send(this.token);
        });

        this.ws.on("message", (evt) => {
            const data = JSON.parse(evt as string);
            this.ws.send("ping");

            switch (data.type) {
                case 0:
                    this.emit("update", `Could not connect to the message broker server`);
                    break;
                case 1:
                    this.emit("update", `Connected to the launcher`);
                    break;
                case 2:
                    this.emit("update", data.msg);
                    this.emit("progress", {
                        speed: data.speed,
                        progress: data.progress,
                    });
                    break;
                case 3:
                    this.emit("update", `Launcher started`);
                    this.emit("game_started");
                    this.started = true;
                    break;
            }
        });

        this.proc.on("close", (code) => {
            this.ws.close();

            if (code !== 0) this.emit("error", new Error(`Process exited with error code ${code}`));
            else if (code === 0 && !this.started) this.start(launcherPath);
        });
    }
}
