import path from "./totify_path";
import Client from "./client";
import { join } from "path";
import TotifyClient from "./totifyClient";
import _debug from "debug";
const debug = _debug("totich:main");

require("dotenv").config({
    path: join(process.cwd(), ".env")
});

(async function(){
    debug("Starting");
    if(!process.env.TWITCH_TOKEN){
        throw new Error("There is no TWITCH_TOKEN");
    }

    let client = new Client(process.env.TWITCH_TOKEN);
    let totifyClient = new TotifyClient(path());
    debug("Clients created");
    
    
    await Promise.all([
        client.init(
            process.env.TWITCH_CHANNELS?.split(';'),
            process.env.TWITCH_USERID,
            process.env.TWITCH_USERNAME
        ),
        totifyClient.init()
    ])
    debug("Clients initialized succesfuly!");

    client.on("online", async (channel)=>{
        await totifyClient.sendNotification(`'${channel.name}' went online! [${channel.status}] Game: '${channel.game}`);
    })

    client.on("gameChange", async (channel)=>{
        await totifyClient.sendNotification(`'${channel.name}' changed game to '${channel.game}'`);
    })
    debug("Listners setted")

    let isSilentModeOn: boolean = !!process.env.TWITCH_SILENT;
    await client.check(isSilentModeOn);
    client.start();

}().catch(e => {
    console.log("Fatal error");
    console.log(e.toString());
    debug(e);
    process.exit(-1);
}))