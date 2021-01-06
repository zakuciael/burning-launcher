import ora, { Options, Ora } from "ora";

export class OraProgressBar {
    public isRunning = false;

    private readonly text: string;
    private readonly total: number;

    private currentStep = 0;
    private currentText: string;
    private currentSpeed = "0 KB/s";
    private ora: Ora;

    constructor(text: string, total: number, options?: Options) {
        this.text = text;
        this.total = total;
        this.currentText = text;

        if (options) {
            options = Object.assign(options, { text: text });
            this.ora = ora(options);
        } else {
            this.ora = ora(this.currentText);
        }
    }

    public start(): void {
        this.updateText();
        this.ora.start();
        this.isRunning = true;
    }

    public progress(progress: number, speed: string): void {
        if (!this.isRunning) throw new Error("This progress bar already stopped");
        if (progress > this.total)
            throw new Error("Invalid progress, progress cannot be bigger than goal");

        this.currentStep = progress;
        this.currentSpeed = speed;
        this.updateText();

        if (progress === this.total) this.succeed();
    }

    public fail(text = ""): void {
        if (!this.isRunning) throw new Error("This progress bar already stopped");
        this.ora.fail(text);
        this.isRunning = false;
    }

    public succeed(text = ""): void {
        if (!this.isRunning) throw new Error("This progress bar already stopped");
        this.ora.succeed(text);
        this.isRunning = false;
    }

    private getPercentage(): string {
        const percentage = Math.floor((this.currentStep / this.total) * 100);
        return `${percentage}%`;
    }

    private updateText() {
        this.currentText = `${this.text} ${this.currentSpeed} ${this.getPercentage()}`;
        this.ora.text = this.currentText;
    }
}
