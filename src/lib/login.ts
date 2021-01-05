import { launch } from "puppeteer";

export const login = (username: string, password: string): Promise<undefined | string> => {
    return new Promise(async (resolve) => {
        const browser = await launch();

        const page = await browser.newPage();
        await page.goto(`https://burningsw.to`);

        await page.click(`div.navbar-burger`);
        await page.click(`#mainNavbar p.x-login-button > a`);

        await page.type(`#loginform input[name='username']`, username);
        await page.type(`#loginform input[name='password']`, password);
        await page.click(`#loginform button.button-login`);

        page.once("requestfinished", async () => {
            const sessionID = (await page.cookies()).find((cookie) => cookie.name === "BSWSESSID")
                ?.value;
            await browser.close();

            resolve(sessionID);
        });
    });
};
