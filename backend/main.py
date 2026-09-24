from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agent.workflow import fraud_agent


app = FastAPI(
    title="TigerGraph Fraud Investigation Agent",
    version="0.1.0"
)


class InvestigationRequest(BaseModel):
    case_id: str
    flagged_txn_id: str


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "TigerGraph Fraud Investigation Agent"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/investigate")
def investigate(request: InvestigationRequest):
    try:
        result = fraud_agent.invoke({
            "case_id": request.case_id,
            "flagged_txn_id": request.flagged_txn_id
        })

        return {
            "status": "success",
            "result": result
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Investigation failed: {str(exc)}"
        )