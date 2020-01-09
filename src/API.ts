const MAIN = "https://api.twitch.tv/kraken";

export interface ChannelInfo {
    _id: number,
    name: string;
    status: string;
}

export interface FollowedChannel {
    channel: ChannelInfo;
}

export interface FollowResponse {
    _total: number;
    follows: FollowedChannel[];
}

export interface StreamInfo {
    _id: number;
    game: string;
    channel: ChannelInfo;
}

export interface StreamInfoResponse {
    _total: number;
    streams: StreamInfo[];
}

export interface User {
    _id: string;
    name: string;
}

export interface UsersResponse {
    _total: number;
    users: User[];
}

export default <const> {
    MAIN: () => MAIN,
    followsFrom: (id: string, limit:number = 25, offset:number = 0) => 
        `${MAIN}/users/${id}/follows/channels?limit=${limit}&offset=${offset}`,
    users: (users: string[]) => `${MAIN}/users?login=${users.join(",")}`,
    streamInfo: (ids: string[]) => `${MAIN}/streams/?channel=${ids.join(",")}`
}