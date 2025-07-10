#!/bin/bash

# Start rinetd
/usr/sbin/rinetd &


 # Load pulseaudio virtual audio source
#pulseaudio -D --exit-idle-time=-1 &
#rm -rf /var/run/pulse /var/lib/pulse $HOME/.config/pulse
#pulseaudio -D --verbose --exit-idle-time=-1 --system --disallow-exit

#pactl load-module module-null-sink sink_name=virtual_speaker sink_properties=device.description="virtual_speaker"
#pactl load-module module-remap-source master=virtual_speaker.monitor source_name=virtual_mic source_properties=device.description="virtual_mic"


# Start Xvfb
#gosu pptruser Xvfb -ac :99 -screen 0 1600x900x16 -nolisten tcp -nolisten unix &
gosu pptruser Xvfb -ac :99 -screen 0 800x600x16 -nolisten tcp -nolisten unix &
sleep 2

# Export DISPLAY variable
export DISPLAY=:99

#export NODE_DEBUG=cluster,net,http,fs,tls,module,timers


# Execute the command provided as arguments
exec gosu pptruser "$@"