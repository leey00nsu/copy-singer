FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VOCAL_PROFILE_STORAGE_ROOT=/data

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/vocal-profile-api/requirements.txt ./
RUN python -m pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

COPY services/vocal-profile-api/requirements-song.txt ./
RUN python -m pip install --no-cache-dir --disable-pip-version-check \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.6.0 torchaudio==2.6.0
RUN python -m pip install --no-cache-dir --disable-pip-version-check -r requirements-song.txt

COPY services/vocal-profile-api/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
