FROM node:18-alpine AS base
RUN mkdir -p /home/node/app \
    && chown -R node:node /home/node && chmod -R 770 /home/node
WORKDIR /home/node/app

FROM base AS builder-server
WORKDIR /home/node/app
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
USER node
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
#RUN set -eux; \
#    npm config set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true \
#     npm config set ignore-scripts true
RUN npm install --loglevel verbose
#RUN npm install --loglevel warn --production                   #Production Opt1
#RUN npm ci --only=production --loglevel warn                   #Production Opt2


FROM ubuntu:22.04 as stage
ENV NODE_MAJOR=18
RUN set -eux; \
       apt-get update \
       && apt-get install -y \
#       alsa-base \
#       alsa-utils \
       ca-certificates \
       curl \
#       dbus-x11 \
       ffmpeg \
#       fonts-freefont-ttf \
#       fonts-ipafont-gothic \
#       fonts-kacst \
#       fonts-liberation \
#       fonts-noto-color-emoji \
#       fonts-thai-tlwg \
#       fonts-wqy-zenhei \
#       gconf-service \
       gnupg \
       gosu \
#       gtk2-engines-pixbuf \
#       libappindicator1 \
#       libasound2 \
#       libatk1.0-0 \
#       libatk-bridge2.0-0 \
#       libc6 \
#       libcairo2 \
#       libcups2 \
#       libdbus-1-3 \
#       libexpat1 \
#       libfontconfig1 \
#       libgbm1 \
#       libgbm-dev \
#       libgcc1 \
#       libgconf-2-4 \
#       libgdk-pixbuf2.0-0 \
#       libglib2.0-0 \
#       libgtk-3-0 \
#       libnspr4 \
#       libnss3 \
#       libpango-1.0-0 \
#       libpangocairo-1.0-0 \
#       libpcre3 \
#       libpcre3-dev \
#       libstdc++6 \
#       libu2f-udev \
#       libvulkan1 \
#       libx11-6 \
#       libx11-xcb1 \
#       libxcb1 \
#       libxcomposite1 \
#       libxcursor1 \
#       libxdamage1 \
#       libxext6 \
#       libxfixes3 \
#       libxi6 \
#       libxrandr2 \
#       libxrender1 \
#       libxss1 \
#       libxtst6 \
       lsb-release \
#       pavucontrol \
#       procps \
#       pulseaudio \
#       pulseaudio-utils \
       rinetd \
       wget \
#       x11-apps \
#       x11vnc \
#       x11-xkb-utils \
#       xdg-utils \
#       xfonts-100dpi \
#       xfonts-75dpi \
#       xfonts-base \
#       xfonts-cyrillic \
#       xfonts-scalable \
       xorg \
       xvfb \
#       zlib1g-dev \
       --no-install-recommends \
       && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
       && echo 'deb http://dl.google.com/linux/chrome/deb/ stable main' >> /etc/apt/sources.list.d/google.list \
       && apt-get update && apt-get install -y google-chrome-stable \
       && mkdir -p /etc/apt/keyrings \
       && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
       && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
       && apt-get update \
       && apt-get install nodejs -y \
       && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Grant permissions for the node user to use Chrome
# Create the directory and set permissions

RUN set -eux; \
#    groupadd -r pptruser && useradd -r -g pptruser -G audio,video,pulse-access,dialout,dip,plugdev pptruser \
    groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /jobs \
    && chown -R pptruser:pptruser /jobs \
    && mkdir -p /jobs/storage \
    && chown -R pptruser:pptruser /jobs/storage \
    && mkdir -p /jobs/realtime \
    && chown -R pptruser:pptruser /jobs/realtime \
    && mkdir -p /jobs/preprocess \
    && chown -R pptruser:pptruser /jobs/preprocess \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/src/app \
    && mkdir -p /usr/src/app/src/jobs/storage/ \
    && chown -R pptruser:pptruser /usr/src/app/src/jobs/storage/


USER pptruser
COPY --chown=pptruser:pptruser --from=builder-server /home/node/app/node_modules ./node_modules
COPY --chown=pptruser:pptruser ./package.json ./package.json
COPY --chown=pptruser:pptruser ./package-lock.json ./package-lock.json

RUN set -eux; \
#    npm config set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true \
     npm config set ignore-scripts true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
#ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable


FROM stage AS build

# Bundle app source
COPY --chown=pptruser:pptruser . .

# Copy the entrypoint script
COPY --chown=pptruser:pptruser entrypoint-ubuntu.sh /usr/src/
RUN set -eux; \
     chmod +x /usr/src/entrypoint-ubuntu.sh


# Expose port (e.g., 3000) if your app requires that
EXPOSE 8000 9222

ENV DISPLAY :99

USER root

# Rinetd
RUN set -eux; \
        echo "0.0.0.0          3000            l1meeting           80" >> /etc/rinetd.conf


# Copy Pulse default config.
#COPY default.pa /etc/pulse/default.pa
#ENV ALSA_CARD=Headset

# Set the entry script as the entrypoint
ENTRYPOINT [ "/usr/src/entrypoint-ubuntu.sh" ]
CMD [ "node", "--trace-warnings", "src/server.js" ]

