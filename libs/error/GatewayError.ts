import { makeError } from "./makeError";

export const GatewayError = makeError(Error, {
    tokenInvalid: 'The provided token is invalid',
    disallowsIntents: "The provided intents are disallowed. Did you forget to enable something or do you even have access???"
})