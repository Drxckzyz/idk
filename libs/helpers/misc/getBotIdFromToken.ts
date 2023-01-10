export function getBotIdFromToken (token: string) {
    return atob(token.split(".")[0]);
}