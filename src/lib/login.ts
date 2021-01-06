import { launch } from "puppeteer";

export const login = (username: string, password: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const browser = await launch();

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
            if (req.response()?.status() !== 200) return;

            const session = await page
                .cookies()
                .then((cookies) => cookies.find((cookie) => cookie.name === "BSWSESSID")?.value);

            await browser.close();
            if (session) resolve(session);
            else reject("Could not find the session in the cookies");
        });
    });
};
