FROM arm32v7/python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        git \
        libjpeg62-turbo-dev \
        libbrotli-dev \
        libbz2-dev \
        libcurl4-openssl-dev \
        libthrift-dev \
        libre2-dev \
        liblz4-dev \
        libprotobuf-dev \
        libsnappy-dev \
        libssl-dev \
        libutf8proc-dev \
        libzstd-dev \
        ninja-build \
        pkg-config \
        protobuf-compiler \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

ARG ARROW_VERSION=apache-arrow-22.0.0

ENV ARROW_HOME=/opt/arrow \
    LD_LIBRARY_PATH=/opt/arrow/lib:$LD_LIBRARY_PATH \
    CMAKE_PREFIX_PATH=/opt/arrow:$CMAKE_PREFIX_PATH

RUN git clone https://github.com/apache/arrow.git /tmp/arrow \
    && cd /tmp/arrow \
    && git checkout ${ARROW_VERSION} \
    && cmake -S /tmp/arrow/cpp -B /tmp/arrow/cpp/build \
        -DCMAKE_INSTALL_PREFIX=$ARROW_HOME \
        --preset ninja-release-python-minimal \
    && cmake --build /tmp/arrow/cpp/build --target install \
    && rm -rf /tmp/arrow

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

ENV UV_NO_SYNC=1 \
    UV_PYTHON=/app/.venv/bin/python \
    PATH="/app/.venv/bin:$PATH"

EXPOSE 8501

CMD ["uv", "run", "--no-sync", "--python", "/app/.venv/bin/python", "streamlit", "run", "app.py", "--server.address=0.0.0.0", "--server.port=8501"]
