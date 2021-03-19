FROM public.ecr.aws/bitnami/node:latest

WORKDIR /srv
ADD ./src/ ./src/
ADD ./*.json ./
RUN npm i -g typescript@latest
RUN npm install
RUN tsc
RUN mkdir -p ./lib/providers; cp ./src/providers/dynamodb.js ./lib/providers/dynamodb.js

CMD ["node", "."]