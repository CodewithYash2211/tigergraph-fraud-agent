from fastapi import FastAPI

app = FastAPI(
    title="TigerGraph Fraud Investigation Agent",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "TigerGraph Fraud Investigation Agent"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}