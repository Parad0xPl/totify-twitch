# Totify-twitch
Simple twitch notifications based on totify bridge. 

Warning: Current version doesn't update "followed" list

## Build
```
npm install
npm run build
```

## Start
```
npm start
```

## Environmental Variables
* TWITCH_TOKEN - Twitch app token
* TOTIFY_PATH - Totify socket patch (if custom)
* TOTIFY_AUTHFILE - Path for file with clients authcode (Default: .authcode)

Channels config:
1) TWITCH_CHANNELS - semicolon separated list of channels to watch
2) TWITCH_USERNAME - username whose twitch "followed" should be watched