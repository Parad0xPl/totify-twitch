import API, { FollowResponse, UsersResponse, StreamInfoResponse, StreamInfo, FollowedChannel } from "./API";
import got, { Got } from "got";
import EventEmiter from "events";

import _debug from "debug";
const debug = _debug("totich:twitchclient");

const MIN_INTERVAL = 1000*60;

let Register: Map<string, Channel> = new Map();

export class Channel {
    public isOnline: boolean = false;
    public status: string = "";
    public game: string = "";

    constructor(public id: string = "", public name: string = ""){
        Register.set(this.id, this);
    }
}

export class ClientError extends Error {
    constructor(message?: string) {
        super(message);
        Error.captureStackTrace(this, this.constructor)
    }
} 

declare interface Client {
    on(event: "init", listener: ()=>void): this;
    on(event: "error", listener: (error: ClientError)=>void): this;
    on(event: "online", listener: (channel: Channel)=>void): this;
    on(event: "offline", listener: (channel: Channel)=>void): this;
    on(event: "gameChange", listener: (channel: Channel)=>void): this;

    emit(event: "init"): boolean;
    emit(event: "error", error: Error): boolean;
    emit(event: "online", channel: Channel): boolean;
    emit(event: "offline", channel: Channel): boolean;
    emit(event: "gameChange", channel: Channel): boolean;
}

class Client extends EventEmiter {
    private checkInterval: number = 1000*60*5; // 5 Minutes
    private followed: Channel[] = [];
    private followedId: string[] = [];
    private userID: string = "0";

    private intervalID?: NodeJS.Timeout;

    private got: Got = got;

    constructor(private ClientID: string){
        super();
        this.got = got.extend({
            headers:{
                "Client-ID": this.ClientID,
                "Accept": "application/vnd.twitchtv.v5+json"
            },
            responseType: "json"
        })
    }

    async init(channels?: string[], userID?: string, user?: string){
        debug("Initilizing")
        if(user){
            debug("Translating username to userid")
            let tranlated = await this.getTranslated([user]);
            if(tranlated.length < 0){
                throw new Error("Couldn't translate username to id");
            }
            debug("Translated id '%d'", tranlated[0].id)
            this.userID = tranlated[0].id;
        }else if(userID){
            this.userID = userID;
        }

        if(channels){
            this.followed = await this.getTranslated(channels);
        }else if(this.userID != "0"){
            this.followed = await this.getFollows();
            // TODO update followed onece for hour
        }else{
            throw new Error("You need to specifie channels to follow or userID/username");
        }
        debug("Following: %s", this.followed.map(ch => ch.name).join(","))
        this.followedId = this.followed.map(el => el.id);
        this.emit("init");
    }

    async getTranslated(users: string[]): Promise<Channel[]>{
        debug("getTranslated");
        let response: UsersResponse = await this.got(API.users(users)).json();
        return response.users.map(el=> {return new Channel(el._id, el.name)})
    }

    async getFollows(): Promise<Channel[]>{
        debug("getFollows");

        let accumulator: FollowedChannel[] = [];
        let ret: FollowResponse;
        let limit: number = 25;
        do {
            ret= await this.got(API.followsFrom(this.userID, limit, accumulator.length)).json();
            accumulator.push(...ret.follows);
        } while(accumulator.length < ret._total);
        return accumulator.map(el => {return new Channel(el.channel._id.toString(), el.channel.name)});
    }

    async getStreams(ids: string[]): Promise<StreamInfo[]>{
        debug("getStreams");
        let streams: StreamInfoResponse = await this.got(API.streamInfo(ids)).json();
        return streams.streams
    }

    // Silent mode - don't emit events for this runs
    async check(silentMode: boolean = false): Promise<void>{
        debug("checking...");
        let streams = await this.getStreams(this.followedId);
        debug("Streams online: %d", streams.length);
        let streamsMap: Map<string, StreamInfo> = new Map();
        debug("Mapping...")
        for(let stream of streams){
            debug("Mapped [%s] to [%s]", stream.channel._id, stream.channel.name);
            streamsMap.set(stream.channel._id.toString(), stream);
        }
        debug("Mapped")
        // Check each followed channel
        let stream: StreamInfo | undefined;
        for(let channel of Register.values()){
            // debug("Checking channel [%s]", channel.name)
            stream = streamsMap.get(channel.id);
            if(stream){
                channel.status = stream.channel.status;
            }
            
            // debug("Is stream? %s\tisOnline: %s\tGame: %s", !!stream, channel.isOnline, channel.game)
            // Change channel status if not on list
            if(channel.isOnline && !stream){
                // Channel went offline
                debug("[%s] went offline", channel.name)
                channel.isOnline = false;
                channel.game = "";
                if(!silentMode){
                    this.emit("offline", channel);
                }
            }else if(!channel.isOnline && stream){
                debug("[%s] went online", channel.name)
                // Channel went online
                channel.isOnline = true;
                channel.game = stream.game || "";
                if(!silentMode){
                    this.emit("online", channel);
                }
            }else if(stream && channel.game != stream?.game){
                debug("[%s] changed game", channel.name)
                // Channel changed game
                channel.game = stream.game;
                if(!silentMode){
                    this.emit("gameChange", channel);
                }
            }
        }
    }

    private interval(){
        this.check().catch(err => this.emit("error", err));
    }

    // Interval managment
    start(){
        if(!this.intervalID){
            let fn = () => {
                this.interval();
            };
            this.intervalID = setInterval(fn , this.checkInterval)
        }
    }

    end(){
        if(this.intervalID){
            clearInterval(this.intervalID);
            this.intervalID = undefined;
        }
    }

    // Set interval time
    setInterval(int: number): Error | undefined{
        if(MIN_INTERVAL> int){
            return new Error("Interval too small");
        }
        this.checkInterval = int;
        return;
    }
}

export default Client;