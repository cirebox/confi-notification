FROM node:20-alpine

RUN curl https://install.meteor.com/?release=3.3.2 | sh

WORKDIR /app

COPY . .

RUN meteor npm install

EXPOSE 3000

CMD ["meteor", "run", "--settings", "settings.json"]
