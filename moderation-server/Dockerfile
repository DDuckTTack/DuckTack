FROM python:3.11-slim

WORKDIR /app

RUN pip install --default-timeout=1000 --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --default-timeout=1000 --no-cache-dir \
    flask \
    transformers \
    safetensors

ARG MODERATION_MODEL_NAME=jinkyeongk/kcELECTRA-toxic-detector
ENV MODERATION_MODEL_NAME=${MODERATION_MODEL_NAME}
RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; name='${MODERATION_MODEL_NAME}'; AutoTokenizer.from_pretrained(name); AutoModelForSequenceClassification.from_pretrained(name)"

COPY app.py .

EXPOSE 5000
CMD ["python", "app.py"]
