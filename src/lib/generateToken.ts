import fetch from "node-fetch";

const InvalidSessionError = new Error("Invalid session provided");

export const generateToken = (session: string): Promise<undefined | string> => {
    return fetch(`https://burningsw.to/api/generate_token`, {
        method: "POST",
        headers: {
            Cookie: `BSWSESSID=${session}`,
        },
    })
        .then((res) => (res.status === 200 ? res.text() : undefined))
        .then((txt) => {
            if (!txt) throw InvalidSessionError;

            const result = txt.match(
                /[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}/i
            );

            if (!result) throw InvalidSessionError;
            else return result[0];
        });
};
