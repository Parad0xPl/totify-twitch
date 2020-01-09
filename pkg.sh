# Build app
echo "Building app from flowtyped to strict javascript"
npm run build

# Remove old builds
echo "Removing old builds"
rm -r builds 2> /dev/null

# Create folders for completed builds
echo "Preparing folders"
mkdir -p builds/linux
mkdir -p builds/windows
mkdir -p builds/macos

# Build js files for 3 platforms
echo "Building exectuables from javascript"
./node_modules/.bin/pkg \
  -t "latest-linux-x64,latest-windows-x64,latest-mac-x64" \
  --output builds/totify-twitch \
  package.json

# Move executables to separate folders
echo "Moving executables to separate folder"
mv builds/totify-twitch-linux builds/linux/totify-twitch
mv builds/totify-twitch-macos builds/macos/totify-twitch
mv builds/totify-twitch-win.exe builds/windows/totify-twitch


