FROM oven/bun:1.3 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY public/charting_library ./public/charting_library
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3000
ENV PORT=3000
CMD ["bun", "run", "start"]
