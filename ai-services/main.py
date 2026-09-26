from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from model import categorizer, predictor

app = FastAPI(
    title="NexWallet AI Engine API",
    description="Machine Learning service for student transaction categorization & overspending risk prediction",
    version="1.0.0"
)

# Enable CORS for frontend and backend Node service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CategorizeRequest(BaseModel):
    merchant: str
    amount: Optional[float] = 0.0

class CategorizeResponse(BaseModel):
    merchant: str
    category: str
    confidence: float

class SpendingPredictionRequest(BaseModel):
    current_day: int
    days_in_month: int
    spent_so_far: float
    monthly_budget: float
    recent_transactions: Optional[List[dict]] = []

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "NexWallet AI Microservice",
        "version": "1.0.0",
        "engine": "Scikit-Learn + NaiveBayes + TrendRegressor"
    }

@app.post("/predict-category", response_model=CategorizeResponse)
def predict_category(req: CategorizeRequest):
    res = categorizer.predict(req.merchant)
    return {
        "merchant": req.merchant,
        "category": res["category"],
        "confidence": res["confidence"]
    }

@app.post("/predict-spending")
def predict_spending(req: SpendingPredictionRequest):
    try:
        result = predictor.predict_spending(
            current_day=req.current_day,
            days_in_month=req.days_in_month,
            spent_so_far=req.spent_so_far,
            monthly_budget=req.monthly_budget,
            recent_transactions=req.recent_transactions or []
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "NexWallet AI Service is up and running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
