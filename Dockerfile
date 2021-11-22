FROM node:16.5.0-alpine3.11 as build

RUN mkdir /panel && mkdir /app

ADD runner-panel.zip /panel/
ADD runner-backend.zip  /app/

RUN cd /panel \
  && unzip runner-panel.zip \
  && rm runner-panel.zip

RUN cd /app \
  && unzip runner-backend.zip \
  && rm runner-backend.zip

RUN cd /app \
  && yarn install --production --registry=https://registry.npm.taobao.org

FROM node:16.5.0-alpine3.11

ENV  LANG=zh_CN.UTF-8 \
  PS1="\u@\h:\w \$ "

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
  && apk update -f \
  && apk upgrade \
  && apk --no-cache add -f bash coreutils moreutils git curl openssl tzdata perl nginx \
  && rm -rf /var/cache/apk/* \
  && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
  && echo "Asia/Shanghai" > /etc/timezone \
  && mkdir /run/nginx \
  && rm -f /etc/nginx/conf.d/default.conf

WORKDIR /app

COPY docker/docker-entrypoint.sh /bin/entrypoint
COPY docker/panel.conf /etc/nginx/conf.d/panel.conf


COPY --from=build /panel /panel
COPY --from=build /app/package.json /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

RUN chmod +x /bin/entrypoint

EXPOSE 3000

ENTRYPOINT ["entrypoint"]
