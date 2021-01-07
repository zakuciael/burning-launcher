import { findCredentials, getPassword, setPassword } from "keytar";
import { constants as fsConstants, promises as fs } from "fs";
import { generatePassword } from "./lib/generatePassword";
import { OraProgressBar } from "./lib/oraProgressBar";
import { generateToken } from "./lib/generateToken";
import { Account } from "./types/Account";
import { Launcher } from "./lib/launcher";
import { accountUI } from "./lib/ui";
import { login } from "./lib/login";
import isAdmin from "is-admin";
import prompts from "prompts";
import Conf from "conf";
import path from "path";
import ora from "ora";

const service = "bsw_launcher";

const fetchAccounts = (): Promise<Account[]> => {
    return findCredentials(service).then((creds) =>
        creds.filter((cred) => cred.account !== "encryption_key")
    );
};

(async () => {
    if (!(await isAdmin())) {
        console.error(new Error("You need to run this program as the administrator"));
        return;
    }

    let encryptionKey = await getPassword(service, "encryption_key");
    if (!encryptionKey) {
        encryptionKey = generatePassword(10);
        await setPassword(service, "encryption_key", encryptionKey);
    }

    const conf = new Conf({
        schema: {
            launcher_path: {
                type: "string",
            },
        },
        projectName: service,
        projectSuffix: "",
        encryptionKey: encryptionKey,
    }) as Conf<{ launcher_path: string }>;

    if (!conf.has("launcher_path")) {
        const launcherPath = await prompts({
            type: "text",
            name: "path",
            message: "Enter launcher path",
            format: (prev) => path.resolve(prev, "launcher.exe"),
            validate: (prev) =>
                fs
                    .access(path.resolve(prev, "launcher.exe"), fsConstants.F_OK)
                    .then(() => true)
                    .catch(() => "Invalid path provided"),
        }).then((ans) => ans.path);
        conf.set("launcher_path", launcherPath);
    }

    const launcherPath = conf.get("launcher_path");
    const username = await accountUI(service, await fetchAccounts());
    const password = (await getPassword(service, username)) as string;

    let downloadProgress: OraProgressBar | undefined;
    const status = ora({
        spinner: "dots",
    });

    status.start(`Logging in...`);
    const session = await login(username, password).catch((err) => {
        status.fail(err.message);
        process.exit(1);
    });
    status.succeed(`Logged in as ${username}`);

    status.start(`Obtaining token from the API...`);
    const token = await generateToken(session).catch((err) => {
        status.fail(err.message);
        process.exit(1);
    });
    status.succeed(`Token obtained!`);

    status.start("Starting launcher process...");
    const launcher = new Launcher(token, "username");

    launcher.on("error", (err) => {
        status.fail(err.message);
        process.exit(1);
    });

    launcher.on("launcher_start", () => {
        status.succeed("Launcher started successfully!");
    });

    launcher.on("update", (msg) => {
        if (status.isSpinning) status.succeed();
        status.start(msg);
    });

    launcher.on("game_started", () => {
        status.succeed("Game started!");
        process.exit(0);
    });

    launcher.on("file_download", (data) => {
        status.stop();

        if (downloadProgress === undefined) {
            downloadProgress = new OraProgressBar(data.text, 100);
            downloadProgress.start();
        }

        downloadProgress.progress(data.progress, data.speed);

        if (!downloadProgress.isRunning) downloadProgress = undefined;
    });

    launcher.start(launcherPath);
})();
