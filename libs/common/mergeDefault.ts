// @ts-ignore
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

export function mergeDefault<T>(def: any, given: T): T {
    if (!given) return def
    for (const key in def) {
        // @ts-expect-error
        if (!has(given, key) || given[key] === undefined) {
            // @ts-expect-error
            given[key] = def[key]
            // @ts-expect-error
        } else if (given[key] === Object(given[key])) {
            // @ts-expect-error
            given[key] = mergeDefault(def[key], given[key])
        }
    }
    return given
}