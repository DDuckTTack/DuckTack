FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libx11-6 \
    libxext6 \
    libsm6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --default-timeout=1000 --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --default-timeout=1000 --no-cache-dir \
    flask \
    pillow \
    numpy \
    ultralytics \
    git+https://github.com/facebookresearch/segment-anything.git

COPY app.py .
COPY 20260429bests.pt .

EXPOSE 5000

CMD ["python", "app.py"]