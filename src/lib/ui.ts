import { deletePassword, setPassword } from "keytar";
import { Account } from "../types/Account";
import prompts from "prompts";

const promptCancel = () => {
    process.exit(0);
};

const accountLoginUI = (skipUsername = false) => {
    return prompts(
        [
            {
                type: () => (!skipUsername ? "text" : null),
                name: "username",
                message: "Account username",
                validate: (prev) =>
                    prev === null || prev.length < 5 || prev.length > 10
                        ? "Please enter valid username (Length: 5-10)"
                        : true,
            },
            {
                type: "password",
                name: "password",
                message: "Account password",
                validate: (prev) =>
                    prev === null || prev.length < 5 || prev.length > 10
                        ? "Please enter valid password (Length: 5-10)"
                        : true,
            },
        ],
        { onCancel: promptCancel }
    );
};

const actionUI = () => {
    return prompts(
        [
            {
                type: "select",
                name: "action",
                message: "What do you want to do?",
                choices: [
                    { title: "Start the game", value: "start_game" },
                    { title: "Edit password", value: "edit_password" },
                    { title: "Delete account", value: "delete_account" },
                    { title: "Go back", value: "back" },
                ],
            },
            {
                type: (prev) => (prev === "delete_account" ? "toggle" : null),
                name: "confirm",
                message: "Are you sure?",
                initial: false,
                active: "yes",
                inactive: "no",
            },
        ],
        { onCancel: promptCancel }
    );
};

export const closeUI = (): Promise<void> => {
    return prompts({
        type: "toggle",
        name: "close",
        message: "Do you want to close the app?",
        initial: true,
        active: "yes",
        inactive: "no",
    }).then((ans) => {
        if (!ans.close) return closeUI();
    });
};

export const accountUI = async (
    service: string,
    accounts: Account[],
    selectedAccount?: string
): Promise<string> => {
    const account =
        selectedAccount !== undefined
            ? selectedAccount
            : await prompts(
                  {
                      type: () => "select",
                      name: "account",
                      message: "Select account",
                      choices: [
                          ...accounts.map((acc) => ({ title: acc.account, value: acc.account })),
                          {
                              title: "Add account",
                              value: "add_account",
                          },
                      ],
                  },
                  { onCancel: promptCancel }
              ).then((ans) => ans.account);

    if (account === "add_account") {
        const newAccount = await accountLoginUI();
        await setPassword(service, newAccount.username, newAccount.password);
        return accountUI(service, [
            ...accounts,
            { account: newAccount.username, password: newAccount.password },
        ]);
    }

    const { action, confirm } = await actionUI();
    if (action === "back") return accountUI(service, accounts);

    if (action === "delete_account") {
        if (confirm === true) {
            await deletePassword(service, account);
            return accountUI(
                service,
                accounts.filter((acc) => acc.account !== account)
            );
        } else return accountUI(service, accounts, account);
    }

    if (action === "edit_password") {
        const { password } = await accountLoginUI(true);
        await setPassword(service, account, password);
        return accountUI(service, accounts, account);
    }

    return account;
};
