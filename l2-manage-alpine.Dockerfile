FROM node:18-alpine AS base
RUN mkdir -p /home/node/app
RUN chown -R node:node /home/node && chmod -R 770 /home/node
WORKDIR /home/node/app

FROM base AS builder-server
WORKDIR /home/node/app
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
USER node
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
#RUN set -eux; \
#     npm config set ignore-scripts true


#RUN set -eux; npm install --loglevel verbose \
#    && npm cache clean --force
#RUN npm install \
#    && npm cache clean --force

#Production Opt1
#RUN npm install --loglevel warn --production           
#    && npm cache clean --force

#Production Opt2
RUN npm ci --only=production --loglevel warn  \          
      && npm cache clean --force


FROM gosu/alpine AS gosu

FROM alpine:3 AS rinetd
RUN set -eux; \
        apk update && apk upgrade --available
RUN set -eux \
    && apk add --no-cache \
        python3 \
        py3-pip \
        build-base \
        git \
        autoconf \
        automake \ 
    && cd /tmp \
    && git clone --depth=1 "https://github.com/samhocevar/rinetd" \
    && cd rinetd \
    && ./bootstrap \
    && ./configure --prefix=/usr \
    && make -j $(nproc) \
    && strip rinetd \
    && rm -rf /var/cache/apk/*


FROM node:18-alpine
RUN set -eux; \
      apk --no-cache upgrade \
      && apk add --no-cache \
#      alsa-utils \
      bash \
      ca-certificates \
      chromium-swiftshader \
      ffmpeg \
      freetype \
      harfbuzz \
      nss \
#      pavucontrol \
#      pulseaudio \
      ttf-freefont \
      xvfb \
      xauth \
	&& rm -vrf /var/cache/apk/*

COPY --from=gosu /usr/local/bin/gosu /usr/local/bin/gosu

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add user so we don't need --no-sandbox.
RUN set -eux; \
    addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

WORKDIR /home/pptruser

COPY --chown=pptruser:pptruser --from=builder-server /home/node/app/node_modules ./node_modules
COPY --chown=pptruser:pptruser ./package.json ./package.json
COPY --chown=pptruser:pptruser ./package-lock.json ./package-lock.json

# Bundle app source
COPY --chown=pptruser:pptruser . .

# Create the directory and set permissions
RUN set -eux; \
    mkdir -p /home/pptruser/src/jobs/storage/ && \
    chown -R pptruser:pptruser /home/pptruser/src/jobs/storage/

# Expose port (e.g., 3000) if your app requires that
EXPOSE 8000 9222

USER root

# Copy Pulse default config.
#COPY default.pa /etc/pulse/default.pa

# Copy the entrypoint script
COPY entrypoint-alpine.sh /home/pptruser/

RUN set -eux; \
     chown -R pptruser:pptruser /home/pptruser/entrypoint-alpine.sh \
     && chmod +x /home/pptruser/entrypoint-alpine.sh


# Debug
#ENV NODE_DEBUG=cluster,net,http,fs,tls,module,timers

# Rinetd port forwarding
COPY --from=rinetd /tmp/rinetd/rinetd /usr/sbin/rinetd

# Rinetd
RUN set -eux; \
        echo "0.0.0.0          3000            l1meeting           3000" >> /etc/rinetd.conf


ENV DISPLAY :99

ENTRYPOINT [ "/home/pptruser/entrypoint-alpine.sh" ]
CMD [ "node", "src/server.js" ]
#CMD [ "node", "--trace-warnings", "src/server.js" ]