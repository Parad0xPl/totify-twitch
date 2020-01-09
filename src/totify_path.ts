import path from "path";

/**
 * Build path of socket
 *
 * @param {string} [instanceName] Instance`s name
 * @returns {string}
 */
function socketPath(instanceName?: string): string {
    if(process.env.TOTIFY_PATH){
        return process.env.TOTIFY_PATH;
    }
    let socketPathArgs = ["/tmp"];
    if (process.platform == "win32") {
        socketPathArgs = ['\\\\?\\pipe'];
    }
    if (instanceName) {
        socketPathArgs.push(`totify_${instanceName}`);
    } else {
        socketPathArgs.push(`totify`);
    }

    const socketPath = path.join.apply(path, socketPathArgs);
    return socketPath;
}

export default socketPath;