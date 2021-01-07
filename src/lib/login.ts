import { executablePath, launch } from "puppeteer";
import path from "path";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const isPkg = typeof process.pkg !== "undefined";

export const login = (username: string, password: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const browser = await launch({
            executablePath: isPkg
                ? executablePath().replace(
                      /^.*?node_modules(\/|\\)puppeteer(\/|\\)\.local-chromium/,
                      path.join(path.dirname(process.execPath), "puppeteer")
                  )
                : executablePath(),
        });

        const page = await browser.newPage();
        await page.goto(`https://burningsw.to`);

        await page.click(`div.navbar-burger`);
        await page.click(`#mainNavbar p.x-login-button > a`);

        await page.type(`#loginform input[name='username']`, username);
        await page.type(`#loginform input[name='password']`, password);
        await page.click(`#loginform button.button-login`);

        page.once("dialog", async (dialog) => {
            await dialog.dismiss();
            await browser.close();

            reject(dialog.message());
        });

        page.once("requestfinished", async (req) => {
            if (req.response()?.status() !== 301) return;

            const session = await page
                .cookies()
                .then((cookies) => cookies.find((cookie) => cookie.name === "BSWSESSID")?.value);

            await browser.close();
            if (session) resolve(session);
            else reject("Could not find the session in the cookies");
        });
    });
};
