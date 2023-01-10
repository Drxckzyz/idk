function getCurrentDate(){
    return new Date().toDateString()
}

function getCurrentTime(){
    return new Date().toTimeString()
}

export function createLogger(level: "debug" | "production"): Logger {

    const buildMsg = (type: string, detail: string, msg: string) => `[${getCurrentDate()} ${getCurrentTime()}] ${type} > [${detail}] ${msg}`

    return {
        info: (detail: string, msg: string) => {
            return console.log(buildMsg("INFO", detail, msg))
        },
        debug: (detail: string, msg: string) => {
            if(level === "production") return
            return console.log(buildMsg("DEBUG", detail, msg))
        },
        error: (detail: string, msg: string) => {
            return console.log(buildMsg("ERROR", detail, msg))
        },
        warn: (detail: string, msg: string) => {
            return console.log(buildMsg("WARN", detail, msg))
        },
    }
}

export interface Logger {
    info: (detail: string, msg: string) => void;
    debug: (detail: string, msg: string) => void;
    error: (detail: string, msg: string) => void;
    warn: (detail: string, msg: string) => void;
}