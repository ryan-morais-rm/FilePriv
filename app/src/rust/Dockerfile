FROM rust:1.93-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libssh2-1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/rust-app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

COPY src ./src/

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libssl3 \
    libssh2-1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/rust-app/target/release/rust .

# Porta para o gRPC
EXPOSE 8080

CMD ["./rust"]