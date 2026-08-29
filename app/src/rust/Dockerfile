FROM rust:1.93-bookworm AS builder

WORKDIR /usr/src/app/rust

RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler \
    libssh2-1-dev \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY src/proto /usr/src/app/proto

COPY src/rust/Cargo.toml src/rust/Cargo.lock* ./
COPY src/rust/build.rs ./
COPY src/rust/src ./src

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssh2-1 \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/rust/target/release/filepriv-rust /usr/local/bin/filepriv-rust

EXPOSE 50051

CMD ["/usr/local/bin/filepriv-rust"]