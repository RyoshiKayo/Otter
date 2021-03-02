FROM public.ecr.aws/bitnami/node:latest

WORKDIR /srv
ADD ./src/ ./src/
ADD ./*.json ./
RUN npm i -g typescript@latest
RUN npm install
RUN tsc

CMD ["node", "."]