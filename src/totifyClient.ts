import net, {Socket} from "net";
import * as fs from "fs";
import EventEmitter from "events";

import _debug from "debug";
const debug = _debug("totich:totifyclient");

function authCodeFilename(): string {
    if(process.env.TWITCH_AUTHFILE){
        return process.env.TWITCH_AUTHFILE;
    }
    return ".authcode";
}

declare interface TotifyClient {
    emit(event: "parsed"): boolean;
    emit(event: "error", error: any): boolean;

    on(event: "parsed", listener: ()=>void): this;
    on(event: "error", listener: (error: any)=>void): this;
}

export class TotifyError extends Error {
    fatal: boolean = false;
    constructor(message?: string, fatal?: boolean){
        super(message);
        if(fatal != undefined){
            this.fatal = fatal;
        }
        Error.captureStackTrace(this, this.constructor);

    }
}

export class TimeoutError extends Error {

}

class TotifyClient extends EventEmitter{
    private Socket: Socket;
    private authcode: string = "";

    private Queue: string[] = [];
    private buffer: string = "";

    read(): Promise<string> {
        debug("Read request")
        return new Promise((res, rej) => {
            if(this.Queue.length > 0){
                debug("Item in queue, returning")
                res(this.Queue.pop());
            }else{
                debug("No iteam in queue, waiting...")
                let timeout: NodeJS.Timeout;
                let parsedListner = ()=>{
                    debug("Parsed somethink, trying to return...")
                    if(this.Queue.length > 0){
                        res(this.Queue.shift());
                    }else{
                        debug("This shouldn't happen!")
                        console.log("There is no elements in queue after parse O>O");
                        rej(new Error("There is no elements in queue after parse O>O"));
                    }
                    if(timeout){
                        debug("Clearing timeout")
                        clearTimeout(timeout);
                    }
                }
                this.once("parsed", parsedListner);
                timeout = setTimeout(()=>{
                    debug("Timeout")
                    this.removeListener("parsed", parsedListner);
                    rej(new TimeoutError());
                }, 10000);
            }
        });
    }

    write(str: string){
        debug("Write to totify");
        this.Socket.write(str);
    }

    private escapeNotificationMessage(str: string): string{
        if(str[0]==';'){
            str = str.replace(";", "\\;");
        }
        str = str.replace(/([^\\]);/g, "$1\\;");
        return str;
    }

    async sendNotification(str: string){
        debug("Sending notification");
        str = this.escapeNotificationMessage(str);
        this.write(`notify;${str};`);
        let status = await this.read();
        if(status == "ERR"){
            let errmsg = await this.read();
            throw new TotifyError(errmsg)
        }
    }

    async register(): Promise<string> {
        debug("Registering with totify");
        this.write("register;Twitch;");
        let response: string = await this.read();
        debug("Returned code '%s'", response);
        console.log("App id: %s", response.split("&")[0]);
        return response.slice(response.indexOf("&")+1);
    }

    async loadAuthcode(){
        debug("Loading authcode");
        let filename = authCodeFilename();
        if(!fs.existsSync(filename)){
            this.authcode = await this.register();
            fs.writeFileSync(filename, this.authcode);
            console.log("App registered, now activate it!");
            process.exit(0);
        }else{
            this.authcode = fs.readFileSync(filename, "utf-8").trim();
        }
    }

    constructor(path: string){
        super();
        debug("Totify connecting to '%s'", path);
        this.Socket = net.createConnection(path);
        this.Socket.setEncoding("utf8");
        this.Socket.on("data", data=>{
            let str: string = data.toString();
            debug("Recived data: '%s'", str);
            this.buffer += str;
            this.parse();
        });
        this.Socket.on("error", (err) => {
            this.emit("error", err)
        })
        this.Socket.on("close", ()=>{
            this.emit("error", new TotifyError("Connection closed!"))
        })
    }

    async init(){
        await this.loadAuthcode();
        this.write(`login;${this.authcode};`);
        let status = await this.read();
        if(status == "ERR"){
            let errmsg = await this.read();
            throw new TotifyError(errmsg);
        }

    }

    parse(){
        let buf: string[] = [];
        let ifEmit = false;
        for(let char of this.buffer){
            if(char == ";"){
                ifEmit = true;
                this.Queue.push(buf.join(""));
                buf = [];
            }else{
                buf.push(char);
            }
        } 
        this.buffer = buf.join("");
        if(ifEmit){
            this.emit("parsed");
        }
    }
}

export default TotifyClient;