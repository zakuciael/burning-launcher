export const generatePassword = (length = 8): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let value = "";

    for (let i = 0, n = charset.length; i < length; ++i)
        value += charset.charAt(Math.floor(Math.random() * n));

    return value;
};
