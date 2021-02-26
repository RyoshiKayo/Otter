FROM mhart/alpine-node

WORKDIR /srv
ADD src src
ADD *.json .
RUN npm i -g typescript@latest
RUN npm install
RUN tsc

CMD ["node", "."]