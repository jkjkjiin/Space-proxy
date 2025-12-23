# 阶段 1: 构建环境 (使用 Node 24 满足项目要求)
FROM node:24-bookworm AS builder

# 设置工作目录
WORKDIR /app

# 安装编译原生模块所需的系统依赖 (解决 wisp, libcurl 报错)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install

# 复制所有源代码
COPY . .

# 运行构建命令，生成 dist 文件夹
RUN npm run build

# -----------------------------------------------------------

# 阶段 2: 运行环境 (使用一个干净、轻量的镜像)
FROM node:24-slim

WORKDIR /app

# 从构建环境中只复制必要的文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public ./public
# 关键：将构建好的 dist 文件夹也复制过来
COPY --from=builder /app/dist ./dist

# 强制程序在 Koyeb 指定的 2345 端口运行
ENV PORT=2345
EXPOSE 2345

# 最终启动命令
CMD ["node", "server.js"]
